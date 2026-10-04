#!/usr/bin/env python3
"""Figure 3. DoD other transaction obligations by fiscal year, as GAO reports them.

Reads  figures/data/ot-obligations.csv
Writes figures/out/ot-obligations.svg and figures/out/ot-obligations.pdf
Run:   python3 figures/scripts/ot-obligations.py   (needs matplotlib; no other dependency)

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


FIG = "ot-obligations"


def main():
    rows = read_csv(FIG)
    years = sorted({r["fiscal_year"] for r in rows})
    measures = []
    for r in rows:
        if r["measure"] not in measures:
            measures.append(r["measure"])
    colour = dict(zip(measures, SERIES))
    fig, ax = plt.subplots(figsize=(10, 5))
    slot = 0.8 / len(measures)
    for xi, fy in enumerate(years):
        present = [m for m in measures if any(r["fiscal_year"] == fy and r["measure"] == m for r in rows)]
        start = xi - slot * len(present) / 2 + slot / 2
        for j, m in enumerate(present):
            r = next(r for r in rows if r["fiscal_year"] == fy and r["measure"] == m)
            v = float(r["obligations_usd_billion"])
            x = start + j * slot
            ax.bar(x, v, width=slot, color=colour[m], edgecolor=SURFACE, linewidth=1.5, zorder=3)
            # direct labels only where the reading matters: the "over" floors and the two FY2021 figures
            if r["qualifier"].startswith("over") or fy == "FY2021":
                first = j == 0 or r["measure"].startswith("All DoD")
                ax.annotate(r["as_published"], (x, v), xytext=(3 if first else -3, 4), textcoords="offset points",
                            ha="right" if first else "left", va="bottom", fontsize=7.5, color=INK2)
    ax.set_xticks(range(len(years)))
    ax.set_xticklabels(years)
    ax.set_ylabel("Obligations, $ billions (as GAO reports them)")
    ax.set_ylim(0, 21)
    clean_axes(ax, "y")
    handles = [plt.Rectangle((0, 0), 1, 1, color=colour[m]) for m in measures]
    ax.legend(handles, measures, loc="upper left", frameon=False, fontsize=8)
    ax.set_title("DoD other transaction obligations by fiscal year, as GAO reports them", loc="left", fontsize=11, color=INK)
    save(fig, FIG)


if __name__ == "__main__":
    main()
