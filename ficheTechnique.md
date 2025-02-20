# 🎵 **Fiche Technique – Générateur de Playlists Intelligentes pour DJs**

## **1️⃣ Présentation du Projet**
### **Nom du projet** : DJ Playlist AI
### **Description**
Une application web permettant aux DJs de générer des playlists intelligentes en fonction de critères comme le BPM, la tonalité et le genre musical. L’application s’intègre avec **Spotify** et **Beatport**, et utilise une IA pour recommander des morceaux adaptés.

### **Objectifs**
- ✅ Permettre aux DJs de créer rapidement des playlists optimisées
- ✅ Utiliser une IA pour proposer des recommandations musicales intelligentes
- ✅ Intégrer une authentification avec Spotify et Beatport
- ✅ Offrir des fonctionnalités sociales (partage, likes, collaboration)

---

## **2️⃣ Architecture et Technologies**

### **Stack Technologique**
#### **Frontend**
- **Next.js** (React)
- **Tailwind CSS** (UI)
- **Zustand** (Gestion d’état)
- **ShadCN UI** (Composants UI)

#### **Backend**
- **NestJS** (Framework backend)
- **Prisma** (ORM pour PostgreSQL)
- **PostgreSQL** (Base de données)
- **Redis** (Cache)
- **WebSockets** (Collaboration en temps réel)

#### **IA & APIs**
- **Spotify API** 🎵 (Rechercher & récupérer des morceaux)
- **Beatport API** 🎚 (Analyser le BPM & tonalité)
- **DeepSeek / OpenAI GPT-4** 🤖 (Recommandations de morceaux)

---

## **3️⃣ Fonctionnalités**

### 🔑 **Authentification & Gestion des utilisateurs**
- Connexion via **OAuth2 (Spotify & Beatport)**
- Gestion des comptes utilisateurs avec **Prisma & PostgreSQL**

### 🎧 **Génération intelligente de playlists**
- Recherche de morceaux en fonction de **BPM, tonalité, genre**
- Génération automatique avec **IA (DeepSeek / GPT-4)**
- Recommandations basées sur l’historique d’écoute

### 🔄 **Gestion des playlists**
- Création, modification et suppression de playlists
- Ajout/suppression de morceaux aux playlists
- Partage et collaboration entre utilisateurs

### 📊 **Fonctionnalités avancées**
- Algorithme de tri des morceaux par **popularité & tendance**
- Mode "mix intelligent" avec transitions fluides
- Notifications en temps réel via **WebSockets**

---

## **4️⃣ Base de Données (Modèle Simplifié)**

### **Utilisateur (`User`)**
| Champ         | Type          | Description                          |
|--------------|--------------|--------------------------------------|
| id           | UUID         | Identifiant unique                   |
| email        | String       | Adresse email                        |
| spotifyId    | String       | ID Spotify de l’utilisateur          |
| beatportId   | String       | ID Beatport de l’utilisateur         |
| createdAt    | Timestamp    | Date de création                     |

### **Playlist (`Playlist`)**
| Champ         | Type          | Description                          |
|--------------|--------------|--------------------------------------|
| id           | UUID         | Identifiant unique                   |
| name         | String       | Nom de la playlist                   |
| ownerId      | UUID (FK)    | Référence vers `User`                |
| createdAt    | Timestamp    | Date de création                     |

### **Morceau (`Track`)**
| Champ         | Type          | Description                          |
|--------------|--------------|--------------------------------------|
| id           | UUID         | Identifiant unique                   |
| title        | String       | Nom du morceau                       |
| artist       | String       | Artiste                              |
| bpm          | Int          | Tempo du morceau                     |
| key          | String       | Tonalité du morceau                  |
| genre        | String       | Genre musical                        |
| spotifyId    | String       | ID du morceau sur Spotify            |
| beatportId   | String       | ID du morceau sur Beatport           |

---

## **5️⃣ Développement & Étapes du Projet**

### **Phase 1 : Configuration & Authentification** ✅
- Mise en place du projet **NestJS** avec **Prisma**
- Configuration de **Next.js** pour le frontend
- Authentification **OAuth2 avec Spotify & Beatport**

### **Phase 2 : Gestion des Playlists** 🔄
- Création des **API REST** pour gérer les playlists
- Intégration des APIs **Spotify & Beatport**

### **Phase 3 : Recommandations & IA** 🤖
- Génération de playlists avec **GPT-4 / DeepSeek**
- Algorithme de tri par **BPM, tonalité, genre**

### **Phase 4 : Expérience Utilisateur & Social** 🚀
- Fonctionnalités **partage, likes, commentaires**
- WebSockets pour **mises à jour en temps réel**

### **Phase 5 : Tests & Déploiement** 🎯
- Tests unitaires avec **Jest**
- Mise en production avec **Docker & Kubernetes**

---

## **6️⃣ API REST Principales (Exemples)**

### 🔑 **Authentification Spotify**
```http
GET /auth/spotify
Response:
{
  "accessToken": "xyz123",
  "refreshToken": "abc456"
}
```

### 🎧 **Génération de Playlist**
```http
POST /playlists/generate
Body:
{
  "bpm": 128,
  "key": "C#m",
  "genre": "Techno"
}
Response:
{
  "playlistId": "1234",
  "tracks": [...]
}
```

### 🔍 **Recherche de Morceaux**
```http
GET /tracks/search?q=house
Response:
{
  "tracks": [
    { "title": "Track 1", "artist": "Artist A", "bpm": 124, "key": "F#m" },
    { "title": "Track 2", "artist": "Artist B", "bpm": 128, "key": "C#m" }
  ]
}
```

