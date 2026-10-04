#!/usr/bin/env python3
"""Figure 4. Posted membership dues and fees on awards per OT consortium, drawn as a table.

Reads  figures/data/consortia-dues.csv
Writes figures/out/consortia-dues.svg and figures/out/consortia-dues.pdf
Run:   python3 figures/scripts/consortia-dues.py   (needs matplotlib; no other dependency)

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


FIG = "consortia-dues"
COLS = [("acronym", "Consortium", 14), ("manager", "Manager", 16), ("sponsor", "Sponsor", 30),
        ("dues_as_posted", "Dues as posted", 46), ("fee_on_awards_as_posted", "Fee on awards as posted", 34),
        ("ref", "Refs", 10)]


def main():
    rows = read_csv(FIG)
    wrapped, heights = [], []
    for r in rows:
        cells = []
        for key, _, width in COLS:
            text = r[key].replace(";", "; ") if key == "ref" else r[key]
            cells.append(textwrap.wrap(text, width) or ["-"])
        wrapped.append(cells)
        heights.append(max(len(c) for c in cells))
    total_chars = sum(w for _, _, w in COLS)
    line_h = 0.165
    fig_h = (sum(heights) + 1.6 * len(rows) * 0.5 + 3) * line_h + 0.6
    fig, ax = plt.subplots(figsize=(13, fig_h))
    ax.axis("off")
    xs, x = [], 0.0
    for _, _, w in COLS:
        xs.append(x)
        x += w / total_chars
    total_lines = sum(heights) + 0.8 * len(rows) + 2.5
    y = 1.0
    for xpos, (_, head, _) in zip(xs, COLS):
        ax.text(xpos, y, head, fontsize=8.5, fontweight="bold", va="top", color=INK, transform=ax.transAxes)
    y -= 1.6 / total_lines
    ax.plot([0, 1], [y + 0.3 / total_lines] * 2, color=AXIS, linewidth=0.8, transform=ax.transAxes, clip_on=False)
    for cells, h in zip(wrapped, heights):
        for xpos, lines in zip(xs, cells):
            ax.text(xpos, y, "\n".join(lines), fontsize=7.5, va="top", color=INK2, transform=ax.transAxes, linespacing=1.25)
        y -= (h + 0.8) / total_lines
        ax.plot([0, 1], [y + 0.35 / total_lines] * 2, color=GRID, linewidth=0.8, transform=ax.transAxes, clip_on=False)
    ax.set_title("Posted membership dues and fees on awards, by consortium (blank = none posted)", loc="left", fontsize=11, color=INK)
    save(fig, FIG)


if __name__ == "__main__":
    main()
