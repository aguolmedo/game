"""Personajes 16x32. Frame A definido a mano; frame B = piernas espejadas."""
from lib import C, mirror_rows

# ---- cabeza con pelo (base)
HEAD_HAIR = [
    "................",
    "................",
    ".....OOOOOO.....",
    "....OHHHHHHO....",
    "...OHHLLHHHHO...",
    "..OHHLHHHHHHhO..",
    "..OHHHHHHHHHhO..",
    "..OHHHHHHHHhhO..",
    "..OhSSSSSSSShO..",
    "..OSSSSSSSSSSO..",
    "..OSSESSSSESSO..",
    "..OSSESSSSESSO..",
    "..OsSSSSSSSSsO..",
    "...OsSSSSSSsO...",
    "....OOssssOO....",
]

BODY_CIVIL = [
    "...OOTTSSTTOO...",
    "..OATTTSSTTTAO..",
    "..OATTTTTTTtAO..",
    "..OATTTTTTTtAO..",
    "..OATTTTTTTtAO..",
    "..OATTTTTTTtAO..",
    "..OSOTTTTTTOSO..",
    "..OOOPPPPPPOOO..",
    "....OPPPPPPO....",
    "....OPPPPPPO....",
    "....OPPOOPPO....",
    "....OPPOOPPO....",
    "....OppOOppO....",
    "....OppOOBBO....",
    "....OBBOOOOO....",
    "....OOOO........",
    "................",
]
LEG_START = 25

BASE = {'O': 'OUT', 'S': 'SK', 's': 'SK2', 'E': 'OUT'}


def frames(grid):
    return [grid, mirror_rows(grid, LEG_START)]


# ---------------- Juan civil
juan_grid = HEAD_HAIR + BODY_CIVIL
juan_map = dict(BASE, H='#2c2028', h='#1c1620', L='#4e3a40',
                T='#c9d2e4', t='#8e98ba', A='#a9b3cf',
                P='#3b4458', p='#272d3e', B='#2c2028')

# ---------------- Juan con traje aislante
suit_grid = [
    "................",
    "................",
    ".....OOOOOO.....",
    "....OMMMMMMO....",
    "...OMMLLMMMMO...",
    "..OMMLMMMMMMmO..",
    "..OMMMMMMMMMmO..",
    "..OMMOOOOOOMmO..",
    "..OMOVWVVVVOmO..",
    "..OMOWVVVVVOmO..",
    "..OMOVeVVeVOmO..",
    "..OMOVVVVvvOmO..",
    "..OmMOOOOOOMmO..",
    "..OmMMMFFMMMmO..",
    "...OmMFffFMmO...",
    "...OOTOFFOTOO...",
    "..OATTTTDTTTAO..",
    "..OATTTTTTTtAO..",
    "..OATTTTDTTtAO..",
    "..OATTTTTTTtAO..",
    "..OATTTTDTTtAO..",
    "..OGOTTTTTTOGO..",
    "..OOOTTTDTTOOO..",
    "...OTTTTTTTtO...",
    "...OtTTTDTTtO...",
    "...OOOOOOOOOO...",
    "....OKKOOKKO....",
    "....OKKOOkkO....",
    "....OkkOOOOO....",
    "....OOOO........",
    "................",
    "................",
]
suit_map = dict(BASE, M='#8a96a0', m='#5c6672', L='#b4c0c6',
                V=('#2f7088', 'cold'), W=('#bdeffa', 'cold'), v='#1f4a60',
                e='#163444', F='#3b4350', f='#22283a',
                T='RC1', t='RC0', A='RC0', D='RC2',
                G='#2a2a36', K='#24242e', k='#16161e')

# ---------------- Favalli: anteojos, saco marron, corbata
fav_grid = [
    "................",
    "................",
    ".....OOOOOO.....",
    "....OHHHHHHO....",
    "...OHLLLHHHHO...",
    "..OHLHHHHHHHhO..",
    "..OHHHHHHHHhhO..",
    "..OHHSSSSSShhO..",
    "..OhSSSSSSSSsO..",
    "..OSgggSSgggSO..",
    "..OSgEgggEgSSO..",
    "..OSgggSSgggSO..",
    "..OsSSSSSSSSsO..",
    "...OsSSmmSSsO...",
    "....OOssssOO....",
    "...OOJWRWWJOO...",
    "..OAJJWRWJJJAO..",
    "..OAJJJRJJJjAO..",
    "..OAJJJRJJJjAO..",
    "..OAJJJJJJJjAO..",
    "..OAJJJJJJJjAO..",
    "..OSOJJJJJJOSO..",
    "..OOOPPPPPPOOO..",
] + BODY_CIVIL[8:]
fav_map = dict(BASE, H='#1e1a26', h='#120f18', L='#3c3448',
               g='#6a6070', m='#9a5a50',
               J='#6b4a3a', j='#4a3028', A='#573a2e', W='#dcdce6', R='#7a2e3a',
               P='#2f3142', p='#1f2030', B='#1a1420')

# ---------------- Lucas: joven, pelo claro revuelto, pulover verde
lucas_grid = [
    "................",
    "....O.OO.O......",
    "...OHOHHOHO.....",
    "...OHHHHHHHOO...",
    "..OHHLLHHHHHHO..",
    "..OHLHHHLHHHhO..",
    "..OHHHHHHHHHhO..",
    "..OHHhHHhHHhhO..",
    "..OhSShSSSShhO..",
    "..OSSSSSSSSSSO..",
    "..OSSESSSSESSO..",
    "..OSSESSSSESSO..",
    "..OsSSSSSSSSsO..",
    "...OsSSmmSSsO...",
    "....OOssssOO....",
    "...OOTTTTTTOO...",
    "..OATTTTTTTTAO..",
    "..OAtTTTTTTtAO..",
    "..OATTTTTTTtAO..",
    "..OAtTTTTTTtAO..",
    "..OATTTTTTTtAO..",
    "..OSOtttttt OSO.".replace(' ', 't')[:16],
    "..OOOPPPPPPOOO..",
] + BODY_CIVIL[8:]
lucas_grid[21] = "..OSOttttttOSO.."
lucas_map = dict(BASE, H='#9a7444', h='#6e5030', L='#c49a5e', m='#a8645a',
                 T='#3f6a5a', t='#2c4c42', A='#355a4c',
                 P='#4a4038', p='#322a26', B='#241a1a')

# ---------------- Polsky: mayor, pelado, canas a los costados, bigote, cardigan
pol_grid = [
    "................",
    "................",
    ".....OOOOOO.....",
    "....OSSSSSSO....",
    "...OSSLLSSSSO...",
    "..OSSLSSSSSSsO..",
    "..OSSSSSSSSSsO..",
    "..OHSSSSSSSShO..",
    "..OHHSSSSSShhO..",
    "..OHSsSSSSsShO..",
    "..OSSESSSSESSO..",
    "..OSSESSSSESSO..",
    "..OsSSSSSSSSsO..",
    "...OsSHHHHSsO...",
    "....OOssssOO....",
    "...OOTWWWWTOO...",
    "..OATTTWWTTTAO..",
    "..OATTTbTTTtAO..",
    "..OATTTTTTTtAO..",
    "..OATTTbTTTtAO..",
    "..OATTTTTTTtAO..",
    "..OSOTTbTTTOSO..",
    "..OOOPPPPPPOOO..",
] + BODY_CIVIL[8:]
pol_map = dict(BASE, H='#b8b8c8', h='#8a8a9c', L='#f2c6a8',
               T='#6a5a7c', t='#4a3e5a', A='#58496a', W='#d8d0c0', b='#c9b37a',
               P='#3a3a48', p='#262634', B='#201820')

# ---------------- Cascarudo: escarabajo gigante, version tierna
cas_body = [
    "................",
    "................",
    "................",
    "................",
    "................",
    "...O........O...",
    "....O......O....",
    ".....O....O.....",
    ".....O....O.....",
    "....OOOOOOOO....",
    "...OCCLLCCCcO...",
    "..OCCLWLCCCCcO..",
    "..OCLLCCOCCCcO..",
    ".OCCLCCCOCCCCcO.",
    ".OCCCCCCOCCCCcO.",
    ".OCCCCCCOCCCCcO.",
    ".OcCCCCCOCCCCcO.",
    ".OcCCCCCOCCCccO.",
    ".OccCCCCOCCcccO.",
    "..OccCCCOCcccO..",
    "...OOccccccOO...",
    "..OOHHHHHHHHOO..",
    "..OHHHHHHHHHHO..",
    ".OHWWWHHHHWWWHO.",
    ".OHWPPHHHHPPWHO.",
    ".OHWPPHHHHPPWHO.",
    "..OHHHHrrHHHHO..",
    "..OhHHHHHHHHhO..",
    "...OhMhhhhMhO...",
    "....OMOOOOMO....",
    ".....O....O.....",
    "................",
]
cas_map = dict(O='OUT', C='#3f3a72', c='#2a2650', L='#6a6aae', W='#d8e8ff',
               H='#2c2a4a', h='#1e1c36', P='#141226', r='#7a4a6a', M='#5a5070')
LEGROWS_A = ((11, 'L'), (15, 'R'), (19, 'L'), (13, 'R'), (17, 'L'), (21, 'R'))


def cas_frames():
    out = []
    for f in (0, 1):
        g = [list(r) for r in cas_body]
        # 3 patas por lado: alternan subir/bajar 1px
        for k, y in enumerate((14, 18, 23)):
            off = (1 if (k + f) % 2 == 0 else -1)
            for side in (0, 1):
                yy = y + (off if side == 0 else -off)
                xs = (0,) if side == 0 else (15,)
                for x in xs:
                    g[yy][x] = 'O'
                    g[yy + 1][x] = 'O'
        out.append([''.join(r) for r in g])
    return out


CHARS = [
    ('JUAN', frames(juan_grid), juan_map),
    ('JUAN TRAJE', frames(suit_grid), suit_map),
    ('FAVALLI', frames(fav_grid), fav_map),
    ('LUCAS', frames(lucas_grid), lucas_map),
    ('POLSKY', frames(pol_grid), pol_map),
    ('CASCARUDO', cas_frames(), cas_map),
]


def back_view(grid, hairkey='H', shadekey='h', bald=False):
    """vista de espaldas: cara -> pelo"""
    g = [list(r) for r in grid]
    for j in range(3, 14):
        for i in range(16):
            ch = g[j][i]
            if ch in 'SEsgmWV':
                if bald and j < 8:
                    g[j][i] = 'S' if ch != 's' else 's'
                else:
                    g[j][i] = shadekey if i >= 11 else hairkey
    for j in range(14, 16):
        for i in range(16):
            if g[j][i] in 'sS':
                g[j][i] = 's'
    for i in range(16):
        if g[15][i] in 'SWRJ':
            g[15][i] = 'T' if 'T' in ''.join(grid[16]) else g[16][4]
    return [''.join(r) for r in g]
