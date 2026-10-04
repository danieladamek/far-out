#!/usr/bin/env python3
"""Figure 8. SBIR/STTR Phase I to Phase III with its branches and transition programs (conceptual).

Reads  figures/data/sbir-phases.json
Writes figures/out/sbir-phases.svg and figures/out/sbir-phases.pdf
Run:   python3 figures/scripts/sbir-phases.py   (needs matplotlib; no other dependency)

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


from matplotlib.patches import FancyBboxPatch

FIG = "sbir-phases"
DX, DY = 3.0, 1.4
STYLE = {  # kind -> (edge colour, width, height, font size, weight)
    "start": (INK2, 1.9, 0.8, 8, "normal"),
    "phase": (SERIES[0], 1.7, 0.95, 10, "bold"),
    "branch": (SERIES[1], 2.3, 0.75, 8, "normal"),
    "group": (SERIES[2], 2.5, 0.75, 8, "bold"),
    "transition": (SERIES[2], 2.3, 0.62, 7.5, "normal"),
}


def main():
    g = read_json(FIG)
    nodes = {n["id"]: n for n in g["nodes"]}
    pos = {n["id"]: (n["col"] * DX, -n["row"] * DY) for n in g["nodes"]}
    # the transition members hang in a tighter list under their group node
    for n in g["nodes"]:
        if n["kind"] == "transition":
            pos[n["id"]] = (n["col"] * DX + 0.25, -2 * DY - 0.85 - (n["row"] - 3) * 0.76)
    fig, ax = plt.subplots(figsize=(14, 8.6))
    for e in g["edges"]:
        (x0, y0), (x1, y1) = pos[e["source"]], pos[e["target"]]
        s, t = STYLE[nodes[e["source"]]["kind"]], STYLE[nodes[e["target"]]["kind"]]
        if e["kind"] == "member":
            xs = x0 - s[1] / 2 + 0.12
            ax.plot([xs, xs, x1 - t[1] / 2], [y0 - s[2] / 2, y1, y1], color=AXIS, linewidth=1.0, zorder=1)
            continue
        main_edge = e["kind"] == "main"
        if abs(y1 - y0) < 1e-6:
            a, b = (x0 + s[1] / 2, y0), (x1 - t[1] / 2, y1)
        elif abs(x1 - x0) < 1e-6:
            sign = 1 if y1 > y0 else -1
            a, b = (x0, y0 + sign * s[2] / 2), (x1, y1 - sign * t[2] / 2)
        else:
            sign = 1 if y1 > y0 else -1
            a, b = (x0 + s[1] / 2, y0), (x1 - t[1] / 2, y1)
            if x1 - x0 < DX * 0.6:
                a, b = (x0, y0 + sign * s[2] / 2), (x1 - t[1] / 2, y1)
        ax.annotate("", b, a, zorder=2,
                    arrowprops=dict(arrowstyle="-|>", color=INK2 if main_edge else MUTED,
                                    linewidth=2.0 if main_edge else 1.1, shrinkA=2, shrinkB=2,
                                    connectionstyle="arc3,rad=0.0"))
        if e.get("label") and main_edge and b[0] - a[0] > 2.0:
            ax.text((a[0] + b[0]) / 2, (a[1] + b[1]) / 2 + 0.12, textwrap.fill(e["label"], 16), ha="center", va="bottom",
                    fontsize=7, color=MUTED)
    for nid, (x, y) in pos.items():
        n = nodes[nid]
        edge, w, h, size, weight = STYLE[n["kind"]]
        ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.02,rounding_size=0.1",
                                    facecolor=SURFACE, edgecolor=edge, linewidth=1.6 if n["kind"] == "phase" else 1.1, zorder=3))
        ax.text(x, y, textwrap.fill(n["label"], 22), ha="center", va="center", fontsize=size, color=INK, fontweight=weight, zorder=4)
    handles = [plt.Line2D([], [], color=STYLE[k][0], linewidth=2, label=lab) for k, lab in
               (("phase", "The three phases"), ("branch", "Other ways in and through"), ("group", "Transition programs"))]
    ax.legend(handles=handles, loc="lower left", frameon=False, fontsize=8)
    xs = [p[0] for p in pos.values()]
    ys = [p[1] for p in pos.values()]
    ax.set_xlim(min(xs) - 1.3, max(xs) + 1.3)
    ax.set_ylim(min(ys) - 0.7, max(ys) + 0.9)
    ax.axis("off")
    ax.set_title("SBIR/STTR: Phase I to Phase III, with the branches around it", loc="left", fontsize=11, color=INK)
    save(fig, FIG)


if __name__ == "__main__":
    main()
