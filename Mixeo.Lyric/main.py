import importlib
import re
import sys
from pathlib import Path

# Vérification de la présence de syncedlyrics
try:
    syncedlyrics = importlib.import_module("syncedlyrics")
except ImportError:
    raise ImportError(
        "Le module 'syncedlyrics' n'est pas installé. Lancez 'pip install syncedlyrics'."
    )

if len(sys.argv) < 2:
    print("Veuillez spécifier le titre de la chanson en argument.")
    print('Exemple : python script.py "Akon Lonely"')
    sys.exit(1)

# On récupère tous les arguments pour éviter les problèmes de guillemets
chanson = " ".join(sys.argv[1:])

# Configuration du dossier cible
DOSSIER_LYRICS = Path("lyrics")
DOSSIER_LYRICS.mkdir(exist_ok=True)


def nettoyer_paroles(texte):
    """Supprime les horodatages de type [00:00.00] ou [00:00] en début de ligne."""
    if not texte:
        return ""
    lignes = texte.split("\n")
    lignes_nettoyees = []
    for ligne in lignes:
        # Supprime tout ce qui ressemble à [xx:xx.xx] ou [xx:xx] ou [tags] au début
        ligne_propre = re.sub(r"^\[\d{2}:\d{2}(?:\.\d{2,3})?\]", "", ligne)
        # Nettoie aussi les potentiels tags de lrc comme [by:xxxxx] ou [al:xxxx]
        if not ligne_propre.startswith("[") or not ligne_propre.endswith("]"):
            lignes_nettoyees.append(ligne_propre.strip())
    return "\n".join(lignes_nettoyees).strip()


def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


def chercher_paroles(requete):
    """Tente de chercher les paroles avec une tolérance aux pannes des providers."""
    # Ordre de préférence des providers pour le FR / EN grand public
    # Deezer et NetEase n'ont souvent pas besoin de token et sont excellents pour Akon, etc.
    providers_a_tester = [None, "deezer", "netease", "musixmatch", "genius"]

    for provider in providers_a_tester:
        try:
            if provider:
                eprint(f"-> Tentative avec le fournisseur : {provider}...")
                res = syncedlyrics.search(requete, providers=[provider])
            else:
                eprint("-> Tentative avec les fournisseurs par défaut...")
                res = syncedlyrics.search(requete)

            if res and len(res.strip()) > 0:
                # Vérification rapide que ce ne sont pas juste des métadonnées
                paroles_propres = nettoyer_paroles(res)
                if paroles_propres:
                    return paroles_propres
        except Exception as e:
            # On ignore l'erreur du provider actuel et on passe au suivant
            eprint(f"   [Erreur {provider or 'default'}] : {e}")
            continue
    return None


# --- Exécution principale ---
eprint(f"Recherche en cours pour : '{chanson}'...")
paroles = chercher_paroles(chanson)

# Si échec, on tente une recherche de secours en nettoyant un peu (ex: si l'utilisateur a mis des tirets)
if not paroles and ("-" in chanson or "_" in chanson):
    alternative = chanson.replace("-", " ").replace("_", " ")
    eprint(f"Aucun résultat. Tentative de secours avec : '{alternative}'...")
    paroles = chercher_paroles(alternative)

if paroles:
    print("\n--- PAROLES TROUVÉES ---")
    print(paroles)
    
    # Optionnel : Sauvegarde dans le dossier lyrics
    # nom_fichier = "".join([c if c.isalnum() else "_" for c in chanson]) + ".txt"
    # (DOSSIER_LYRICS / nom_fichier).write_text(paroles, encoding="utf-8")
else:
    eprint("\n[X] Impossible de trouver les paroles pour cette chanson sur aucun fournisseur.")
    sys.exit(1)