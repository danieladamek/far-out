#!/usr/bin/env python3
"""Figure 7. Dated changes from changes.yaml, December 2024 to October 2026, by status.

Reads  figures/data/changes-timeline.csv
Writes figures/out/changes-timeline.svg and figures/out/changes-timeline.pdf
Run:   python3 figures/scripts/changes-timeline.py   (needs matplotlib; no other dependency)

Values are plotted as the data file gives them; nothing is recomputed here beyond unit scaling for the axis.
"""
import csv
import json
import os
import textwrap

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.join(HERE, "..", "data")
OUT = os.path.join(HERE, "..", "out")

# Chart chrome and series colours (light surface). Text always uses ink tokens, never a series colour.
SURFACE = "#fcfcfb"
INK = "#0b0b0b"
INK2 = "#52514e"
MUTED = "#898781"
GRID = "#e1e0d9"
AXIS = "#c3c2b7"
SERIES = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100", "#e87ba4", "#008300", "#4a3aa7", "#e34948"]

plt.rcParams.update({
    "font.family": "DejaVu Sans",  # bundled with matplotlib, so output is the same on every machine
    "font.size": 9,
    "svg.fonttype": "none",
    "pdf.fonttype": 42,
    "figure.facecolor": SURFACE,
    "axes.facecolor": SURFACE,
    "savefig.facecolor": SURFACE,
    "text.color": INK,
    "axes.labelcolor": INK2,
    "axes.edgecolor": AXIS,
    "xtick.color": MUTED,
    "ytick.color": MUTED,
    "xtick.labelcolor": INK2,
    "ytick.labelcolor": INK2,
    "axes.linewidth": 0.8,
})
if "text.parse_math" in plt.rcParams:  # dollar signs in labels are literal, not mathtext
    plt.rcParams["text.parse_math"] = False


def read_csv(name):
    with open(os.path.join(DATA, name + ".csv"), newline="", encoding="utf-8") as f:
        return list(csv.DictReader(f))


def read_json(name):
    with open(os.path.join(DATA, name + ".json"), encoding="utf-8") as f:
        return json.load(f)


def clean_axes(ax, grid_axis="y"):
    for side in ("top", "right"):
        ax.spines[side].set_visible(False)
    ax.grid(axis=grid_axis, color=GRID, linewidth=0.8)
    ax.set_axisbelow(True)
    ax.tick_params(length=0)


def save(fig, name):
    os.makedirs(OUT, exist_ok=True)
    for ext in ("svg", "pdf"):
        fig.savefig(os.path.join(OUT, name + "." + ext), bbox_inches="tight")
    plt.close(fig)
    print("wrote", os.path.join("figures", "out", name + ".svg"), "and .pdf")


import datetime as dt

import matplotlib.dates as mdates

FIG = "changes-timeline"
STATUSES = ["final", "class-deviation", "pending-implementation", "proposed", "announced"]
# three colours for how the item is sourced; marker shape repeats the distinction
BASIS = {
    "primary": ("Primary text read", SERIES[0], "o"),
    "primary-partial": ("Primary text read in part", SERIES[1], "s"),
    "secondary-only": ("Not confirmed from a primary text", SERIES[2], "D"),
    "unread": ("Not confirmed from a primary text", SERIES[2], "D"),
    "unconfirmed": ("Not confirmed from a primary text", SERIES[2], "D"),
}
CALLOUTS = {
    "chg-eo-14275-far-overhaul": "EO 14275: FAR overhaul",
    "chg-far-thresholds-2025-10-01": "Thresholds rise",
    "chg-ndaa-fy26-1802-pae": "FY2026 NDAA",
    "chg-pl-119-83-reauthorization": "SBIR/STTR reauthorized",
    "chg-cmmc-phase-ii-suspended": "CMMC Phase II suspended",
    "chg-8a-social-disadvantage-rule": "8(a) final rule",
    "chg-rfo-proposed-rules-2026-06-23": "First FAR proposed rules",
}


def main():
    rows = read_csv(FIG)
    fig, ax = plt.subplots(figsize=(12, 7.4))
    count, stack = {}, {}
    for r in rows:
        key = (r["plot_date"], r["status"])
        count[key] = count.get(key, 0) + 1
    for r in rows:
        d = dt.date.fromisoformat(r["plot_date"])
        lane = STATUSES.index(r["status"])
        key = (r["plot_date"], r["status"])
        k = stack.get(key, 0)
        stack[key] = k + 1
        # items that share a date and a status are stacked inside their lane
        step = min(0.15, 0.86 / count[key])
        y = lane + (k - (count[key] - 1) / 2) * step
        _, colour, marker = BASIS[r["basis"]]
        ax.scatter([d], [y], s=64, color=colour, marker=marker, edgecolor=SURFACE, linewidth=1.5, zorder=3)
        if r["id"] in CALLOUTS:
            top = lane - (count[key] - 1) / 2 * step
            ax.annotate(CALLOUTS[r["id"]], (d, top), xytext=(0, 14), textcoords="offset points", ha="center",
                        va="bottom", fontsize=7.5, color=INK2,
                        arrowprops=dict(arrowstyle="-", color=AXIS, linewidth=0.8, shrinkA=0, shrinkB=4))
    ax.set_yticks(range(len(STATUSES)))
    ax.set_yticklabels(STATUSES)
    ax.set_ylim(-0.75, len(STATUSES) - 0.4)
    ax.invert_yaxis()
    ax.set_xlim(dt.date(2024, 11, 15), dt.date(2026, 10, 31))
    ax.xaxis.set_major_locator(mdates.MonthLocator(bymonth=(1, 4, 7, 10)))
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%b %Y"))
    ax.set_xlabel("Date of the change as recorded (month-only dates plotted on the first of the month)")
    clean_axes(ax, "both")
    ax.spines["left"].set_visible(False)
    seen, handles = set(), []
    for label, colour, marker in BASIS.values():
        if label not in seen:
            seen.add(label)
            handles.append(plt.Line2D([], [], linestyle="", marker=marker, color=colour, markersize=7, label=label))
    ax.legend(handles=handles, loc="upper left", bbox_to_anchor=(0, -0.13), ncol=3, frameon=False, fontsize=8)
    ax.set_title("What changed, December 2024 to October 2026, by status", loc="left", fontsize=11, color=INK)
    save(fig, FIG)


if __name__ == "__main__":
    main()
