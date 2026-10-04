#!/usr/bin/env python3
"""Figure 1. Dollar thresholds in force since October 1, 2025: a prior-to-current dumbbell per row of the table.

Reads  figures/data/thresholds-2025.csv
Writes figures/out/thresholds-2025.svg and figures/out/thresholds-2025.pdf
Run:   python3 figures/scripts/thresholds-2025.py   (needs matplotlib; no other dependency)

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


FIG = "thresholds-2025"


def money(v):
    v = float(v)
    if v >= 1e6:
        return "${:g}M".format(v / 1e6)
    if v >= 1e3:
        return "${:g}K".format(v / 1e3)
    return "${:g}".format(v)


def main():
    rows = read_csv(FIG)
    kinds = ["FAR", "SBA regulation", "statute"]
    colour = dict(zip(kinds, SERIES))
    marker = dict(zip(kinds, ["o", "s", "D"]))
    n = len(rows)
    fig, ax = plt.subplots(figsize=(11, 0.36 * n + 1.6))
    labels = []
    for i, r in enumerate(rows):
        y = n - 1 - i
        cur = float(r["amount_usd"])
        k = r["source_type"]
        if r["prior_usd"]:
            prior = float(r["prior_usd"])
            ax.plot([prior, cur], [y, y], color=AXIS, linewidth=2, solid_capstyle="round", zorder=2)
            ax.scatter([prior], [y], s=46, facecolor=SURFACE, edgecolor=colour[k], linewidth=1.6, marker=marker[k], zorder=3)
        ax.scatter([cur], [y], s=58, color=colour[k], edgecolor=SURFACE, linewidth=1.5, marker=marker[k], zorder=4)
        ax.annotate(r["amount_as_published"], (cur, y), xytext=(8, 0), textcoords="offset points",
                    va="center", ha="left", fontsize=8, color=INK2)
        labels.append(textwrap.shorten(r["threshold"], 58, placeholder="...") + "  |  " + r["governing_text"].split(";")[0])
    ax.set_yticks(range(n))
    ax.set_yticklabels(labels[::-1], fontsize=8)
    ax.set_xscale("log")
    ax.set_xlim(1e3, 2e8)
    ticks = [1e3, 1e4, 1e5, 1e6, 1e7, 1e8]
    ax.set_xticks(ticks)
    ax.set_xticklabels([money(t) for t in ticks])
    ax.set_xlabel("Dollar threshold (log scale); hollow marker = figure before October 1, 2025")
    clean_axes(ax, "x")
    ax.spines["left"].set_visible(False)
    handles = [plt.Line2D([], [], linestyle="", marker=marker[k], color=colour[k], markersize=7, label=k) for k in kinds]
    ax.legend(handles=handles, title="Text that prints the figure", loc="lower right", frameon=False, fontsize=8, title_fontsize=8)
    ax.set_title("Dollar thresholds in force since October 1, 2025, with the text that sets each", loc="left", fontsize=11, color=INK)
    save(fig, FIG)


if __name__ == "__main__":
    main()
