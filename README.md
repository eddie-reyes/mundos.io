# mundos.io 🌍

**mundos.io** is an online multiplayer game inspired by *Katamari Damacy*, focused on fast-paced, physics-driven gameplay where players roll, collect, and grow within a shared 3D world.

> ⚠️ **Status:** The project is not currently live due to server upkeep costs.

---

## 🎮 Gameplay Overview

Players control a rolling entity that collects objects in the environment to grow in size. As players grow, they can interact with larger objects and compete in real time with other players connected to the same world.

Core gameplay pillars:
- Physics-driven object collection
- Real-time multiplayer interaction
- Dynamic scaling and progression
- Stylized, playful 3D environments

---

## 🛠️ Tech Stack

### Frontend
- **JavaScript**
- **Three.js** – real-time 3D graphics and rendering
- **HTML / CSS**

### Backend
- **Node.js**
- **Express.js** – server and API logic
- **Socket.IO** – real-time multiplayer communication

---

## 🌐 Multiplayer Architecture

- The server maintains authoritative game state
- Clients send movement and interaction updates via Socket.IO
- Player positions, object states, and events are synchronized in real time
- Designed for low-latency interactions and scalability

---

![mundos-d0fd499b](https://github.com/user-attachments/assets/fbf6766d-f81e-4e27-a30f-407ccca3423f)

