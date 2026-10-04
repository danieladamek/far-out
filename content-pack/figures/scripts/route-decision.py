#!/usr/bin/env python3
"""Figure 6. Decision flow from five situations to four route families and their main routes (conceptual).

Reads  figures/data/route-decision.json
Writes figures/out/route-decision.svg and figures/out/route-decision.pdf
Run:   python3 figures/scripts/route-decision.py   (needs matplotlib; no other dependency)

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

FIG = "route-decision"
FAMILY_ORDER = ["setaside-vehicle", "sbir-sttr", "ot-cso", "partnering"]
FAMILY_COLOUR = dict(zip(FAMILY_ORDER, SERIES))
X = {"question": 0.0, "situation": 2.3, "gate": 2.3, "family": 5.1, "route": 8.2}
W = {"question": 1.5, "situation": 2.0, "gate": 2.0, "family": 2.3, "route": 3.3}


def box(ax, x, y, w, h, text, edge, fill=SURFACE, size=7.5, weight="normal"):
    ax.add_patch(FancyBboxPatch((x - w / 2, y - h / 2), w, h, boxstyle="round,pad=0.02,rounding_size=0.08",
                                facecolor=fill, edgecolor=edge, linewidth=1.2, zorder=3))
    ax.text(x, y, text, ha="center", va="center", fontsize=size, color=INK, zorder=4, fontweight=weight)


def main():
    g = read_json(FIG)
    nodes = {n["id"]: n for n in g["nodes"]}
    routes = [n for n in g["nodes"] if n["kind"] == "route"]
    routes.sort(key=lambda n: FAMILY_ORDER.index(n["family"]))
    pos, y, prev = {}, 0.0, None
    for n in routes:
        if prev and n["family"] != prev:
            y -= 0.6
        pos[n["id"]] = (X["route"], y)
        y -= 0.72
        prev = n["family"]
    bottom = y
    for fam in FAMILY_ORDER:
        ys = [pos[n["id"]][1] for n in routes if n["family"] == fam]
        pos["fam-" + fam] = (X["family"], sum(ys) / len(ys))
    sits = [n for n in g["nodes"] if n["kind"] == "situation"]
    span = bottom + 0.72
    for i, n in enumerate(sits):
        pos[n["id"]] = (X["situation"], span * (i + 1.4) / (len(sits) + 0.8))
    pos["gate-sam"] = (X["gate"], pos[sits[0]["id"]][1] + 2.3)
    pos["start"] = (X["question"], span / 2)

    fig, ax = plt.subplots(figsize=(13, 0.33 * abs(bottom) + 1.4))
    for e in g["edges"]:
        (x0, y0), (x1, y1) = pos[e["source"]], pos[e["target"]]
        w0 = W[nodes[e["source"]]["kind"]] / 2
        w1 = W[nodes[e["target"]]["kind"]] / 2
        kind = e["kind"]
        if kind == "gate":
            ax.annotate("", (x1, y1 - 0.72), (x0, y0 + 0.5), arrowprops=dict(arrowstyle="-|>", color=MUTED, linewidth=1.2), zorder=2)
            continue
        colour, lw, alpha = MUTED, 1.0, 0.9
        if kind == "leads-to":
            lw = 0.7 + 0.45 * len(e["routes"])
            colour = FAMILY_COLOUR[nodes[e["target"]]["family"]]
            alpha = 0.55
        elif kind == "contains":
            colour = FAMILY_COLOUR[nodes[e["target"]]["family"]]
            lw = 0.9
        ax.plot([x0 + w0, x1 - w1], [y0, y1], color=colour, linewidth=lw, alpha=alpha, zorder=1, solid_capstyle="round")
    for nid, (x, yy) in pos.items():
        n = nodes[nid]
        k = n["kind"]
        if k == "route":
            box(ax, x, yy, W[k], 0.56, textwrap.shorten(n["label"], 48, placeholder="..."), FAMILY_COLOUR[n["family"]], size=7.2)
        elif k == "family":
            box(ax, x, yy, W[k], 1.25, textwrap.fill(n["label"], 24), FAMILY_COLOUR[n["family"]], size=8, weight="bold")
        elif k == "gate":
            box(ax, x, yy, W[k], 1.35, textwrap.fill(n["label"], 22), MUTED, size=7.2)
        elif k == "situation":
            box(ax, x, yy, W[k], 0.95, textwrap.fill(n["label"], 22), INK2, size=8)
        else:
            box(ax, x, yy, W[k], 1.0, textwrap.fill(n["label"], 14), INK, size=8.5, weight="bold")
    for xk, head in ((X["question"], "Start"), (X["situation"], "Situation"), (X["family"], "Route family"), (X["route"], "Main routes")):
        ax.text(xk, 1.05, head, ha="center", va="bottom", fontsize=9, color=MUTED)
    ax.set_xlim(-1.0, X["route"] + W["route"] / 2 + 0.2)
    ax.set_ylim(bottom - 0.2, max(1.6, pos["gate-sam"][1] + 0.8))
    ax.axis("off")
    ax.set_title("From where a firm stands to the routes that fit (line weight = number of routes shown that carry the situation tag)",
                 loc="left", fontsize=10.5, color=INK)
    save(fig, FIG)


if __name__ == "__main__":
    main()
