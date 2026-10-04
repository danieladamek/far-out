#!/usr/bin/env python3
"""Figure 2. SBIR/STTR Phase I and Phase II amounts as posted, one row per agency or component and source.

Reads  figures/data/sbir-amounts-by-agency.csv
Writes figures/out/sbir-amounts-by-agency.svg and figures/out/sbir-amounts-by-agency.pdf
Run:   python3 figures/scripts/sbir-amounts-by-agency.py   (needs matplotlib; no other dependency)

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


FIG = "sbir-amounts-by-agency"


def main():
    rows = read_csv(FIG)
    labels = []
    agency = {}
    for r in rows:
        if r["label"] not in labels:
            labels.append(r["label"])
            agency[r["label"]] = r["agency"]
    # one y position per label, with a gap between agencies
    ypos, y, prev = {}, 0.0, None
    for lab in labels:
        if prev is not None and agency[lab] != prev:
            y += 0.7
        ypos[lab] = y
        y += 1.0
        prev = agency[lab]
    height = 0.27 * y + 1.6
    fig, axes = plt.subplots(1, 2, figsize=(12, height), sharey=True, gridspec_kw={"wspace": 0.06})
    for ax, phase, colour in zip(axes, ["Phase I", "Phase II"], SERIES[:2]):
        sub = [r for r in rows if r["phase"] == phase]
        ax.barh([ypos[r["label"]] for r in sub], [float(r["amount_usd"]) / 1e3 for r in sub], height=0.62,
                color=colour, edgecolor=SURFACE, linewidth=1.0, zorder=3)
        ax.set_title(phase, loc="left", fontsize=9.5, color=INK2, pad=4)
        ax.set_xlabel("Posted amount, $ thousands (upper bound where a range is posted)")
        ax.xaxis.set_major_formatter(matplotlib.ticker.StrMethodFormatter("{x:,.0f}"))
        clean_axes(ax, "x")
        ax.spines["left"].set_color(AXIS)
    axes[0].set_yticks([ypos[l] for l in labels])
    axes[0].set_yticklabels(labels, fontsize=7.5)
    axes[0].set_ylim(y - 0.3, -0.7)  # first label at the top, no dead space above or below
    # the two panel titles name the series, so no separate legend box is needed
    axes[0].text(0, 1.035, "SBIR/STTR Phase I and Phase II amounts as posted, one row per source",
                 transform=axes[0].transAxes, ha="left", va="bottom", fontsize=11, color=INK)
    save(fig, FIG)


if __name__ == "__main__":
    import matplotlib.ticker  # noqa: F401
    main()
