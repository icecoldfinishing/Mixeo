import importlib
import re
import sys
from pathlib import Path

# On force la sortie standard en UTF-8 pour éviter les caractères corrompus ()
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")

# Vérification de la présence de syncedlyrics
try:
    syncedlyrics = importlib.import_module("syncedlyrics")
except ImportError:
    raise ImportError(
        "Le module 'syncedlyrics' n'est pas installé. Lancez 'pip install syncedlyrics'."
    )

if len(sys.argv) < 2:
    print("Veuillez spécifier le titre de la chanson en argument.")
    print('Exemple : python script.py "Akon - Lonely (Official Video)"')
    sys.exit(1)

chanson_brute = " ".join(sys.argv[1:])

# Configuration du dossier cible
DOSSIER_LYRICS = Path("lyrics")
DOSSIER_LYRICS.mkdir(exist_ok=True)


def nettoyer_nom_chanson(nom):
    """Supprime les obstacles du titre (parenthèses, crochets, ID Youtube, tags...)."""
    if not nom:
        return ""
    # Enlève tout entre crochets [] et parenthèses ()
    nom_propre = re.sub(r"\[.*?\]", "", nom)
    nom_propre = re.sub(r"\(.*?\)", "", nom_propre)
    
    # Enlève les mots clés marketing/parasites
    parasites = [
        r"\bofficial\b", r"\bvideo\b", r"\bclip\b", r"\blyrics\b", 
        r"\baudio\b", r"\bhd\b", r"\b4k\b", r"\bft\b", r"\bfeat\b"
    ]
    for parasite in parasites:
        nom_propre = re.sub(parasite, "", nom_propre, flags=re.IGNORECASE)
    
    # Clean les caractères de liaison et espaces multiples
    nom_propre = nom_propre.replace("_", " ").replace("-", " ")
    return re.sub(r"\s+", " ", nom_propre).strip()


def nettoyer_paroles(texte):
    """Extrait le texte pur en supprimant les horodatages [00:00.00]."""
    if not texte:
        return ""
    lignes = texte.split("\n")
    lignes_nettoyees = []
    for ligne in lignes:
        # Supprime l'horodatage au début de la ligne
        ligne_propre = re.sub(r"^\[\d{2}:\d{2}(?:\.\d{2,3})?\]", "", ligne).strip()
        
        # Filtre les tags de métadonnées LRC restants (ex: [ar:Akon])
        if ligne_propre.startswith("[") and ligne_propre.endswith("]"):
            continue
            
        lignes_nettoyees.append(ligne_propre)
        
    # Rejoint et supprime les sauts de lignes triples résiduels
    texte_propre = "\n".join(lignes_nettoyees).strip()
    return re.sub(r'\n{3,}', '\n\n', texte_propre)


def eprint(*args, **kwargs):
    print(*args, file=sys.stderr, **kwargs)


def chercher_paroles(requete):
    """Parcourt les fournisseurs un par un pour éviter qu'un crash bloque tout."""
    providers_a_tester = [None, "deezer", "netease", "musixmatch", "genius"]

    for provider in providers_a_tester:
        try:
            if provider:
                eprint(f"-> Tentative avec : {provider}...")
                res = syncedlyrics.search(requete, providers=[provider])
            else:
                eprint("-> Tentative avec les providers par défaut...")
                res = syncedlyrics.search(requete)

            if res and len(res.strip()) > 0:
                paroles_propres = nettoyer_paroles(res)
                if paroles_propres and len(paroles_propres.replace("\n", "").strip()) > 0:
                    return paroles_propres
        except Exception as e:
            eprint(f"   [Erreur {provider or 'default'}] : {e}")
            continue
    return None


# --- Traitement Principal ---
chanson_nettoyee = nettoyer_nom_chanson(chanson_brute)

eprint(f"Entrée brute       : '{chanson_brute}'")
eprint(f"Recherche nettoyée : '{chanson_nettoyee}'\n")

if not chanson_nettoyee:
    eprint("[X] Erreur : Nom de chanson vide après nettoyage.")
    sys.exit(1)

paroles = chercher_paroles(chanson_nettoyee)

if paroles:
    # Utilisation de caractères simples pour éviter les bugs d'affichage de console Windows
    print("\n")
    print(paroles)
    print("")
    
    # Sauvegarde automatique propre
    nom_fichier = "".join([c if c.isalnum() else "_" for c in chanson_nettoyee]) + ".txt"
    nom_fichier = re.sub(r'_{2,}', '_', nom_fichier).strip('_')
    try:
        (DOSSIER_LYRICS / nom_fichier).write_text(paroles, encoding="utf-8")
        eprint(f"\n[Sauvegarde OK] -> {DOSSIER_LYRICS / nom_fichier}")
    except Exception as e_ecriture:
        eprint(f"\n[Erreur Écriture] : {e_ecriture}")
else:
    eprint("\n[X] Impossible de trouver les paroles sur aucun fournisseur.")
    sys.exit(1)