import importlib
import re
from pathlib import Path

# On s'assure que syncedlyrics est présent
try:
    syncedlyrics = importlib.import_module("syncedlyrics")
except ImportError:
    raise ImportError(
        "Le module 'syncedlyrics' n'est pas installé. Lancez 'pip install syncedlyrics'."
    )

chanson = "Maes - Le Moine"

# Configuration du dossier cible
DOSSIER_LYRICS = Path("lyrics")
DOSSIER_LYRICS.mkdir(exist_ok=True)


def nettoyer_paroles(texte):
    """Supprime les horodatages de type [00:00.00] ou [00:00] en début de ligne."""
    lignes = texte.split("\n")
    lignes_nettoyees = []
    for ligne in lignes:
        # Supprime tout ce qui ressemble à [xx:xx.xx] ou [xx:xx] au début
        ligne_propre = re.sub(r"^\[\d{2}:\d{2}(?:\.\d{2,3})?\]", "", ligne)
        lignes_nettoyees.append(ligne_propre.strip())
    return "\n".join(lignes_nettoyees)


def generer_nom_fichier(nom_chanson):
    """Convertit le nom de la chanson en un nom de fichier propre."""
    # Remplace les caractères non alphanumériques par des underscores
    nom_propre = re.sub(r"[^\w\s-]", "", nom_chanson)
    nom_propre = re.sub(r"[\s-]+", "_", nom_propre).strip("_")
    return f"{nom_propre.lower()}.txt"


# Détermination du chemin complet du fichier de sortie (dans le dossier lyrics)
chemin_fichier = DOSSIER_LYRICS / generer_nom_fichier(chanson)

try:
    print(f"Recherche en cours pour : {chanson}...")
    # Recherche principale avec les fournisseurs prioritaires
    paroles = syncedlyrics.search(
        chanson, providers=["musixmatch", "netease", "genius"]
    )

    if paroles:
        paroles_brutes = nettoyer_paroles(paroles)
        chemin_fichier.write_text(paroles_brutes, encoding="utf-8")
        print(f"Succes ! Les paroles ont ete enregistrees dans '{chemin_fichier}'.")
    else:
        print("Aucune parole trouvee pour cette chanson.")

except Exception as e:
    print(
        f"Erreur lors de la recherche principale ({e}). Tentative de secours via Genius..."
    )
    try:
        paroles = syncedlyrics.search(chanson, providers=["genius"])
        if paroles:
            paroles_brutes = nettoyer_paroles(paroles)
            chemin_fichier.write_text(paroles_brutes, encoding="utf-8")
            print(f"Succes via le serveur de secours ! Fichier : '{chemin_fichier}'")
        else:
            print("Le serveur de secours n'a rien trouve non plus.")
    except Exception as e_secours:
        print(f"Echec de la recherche de secours : {e_secours}")