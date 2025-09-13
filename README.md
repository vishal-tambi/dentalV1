
# 🦷 OralVis Healthcare

> 🚀 A modern **MERN-stack dental healthcare application** where patients upload dental images 🖼️ and doctors review, annotate, and generate professional PDF reports 📑.

![OralVis Banner](https://via.placeholder.com/1000x300?text=OralVis+Healthcare+App+Banner)

![MERN Stack](https://img.shields.io/badge/Stack-MERN-green?style=for-the-badge)
![React](https://img.shields.io/badge/React-18-blue?style=for-the-badge\&logo=react)
![Node.js](https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge\&logo=node.js)
![MongoDB](https://img.shields.io/badge/MongoDB-Latest-green?style=for-the-badge\&logo=mongodb)

---

## 📌 Quick Links

* [✨ Features](#-features)
* [⚡ Quick Start](#-quick-start)
* [🛠 Tech Stack](#-tech-stack)
* [📸 Screenshots](#-screenshots)
* [📂 Project Structure](#-project-structure)
* [🎯 Usage Flow](#-application-flow)
* [📚 API Endpoints](#-api-endpoints)
* [🔧 Environment Variables](#-environment-variables)
* [🤝 Contributing](#-contributing)
* [📄 License](#-license)

---

## ✨ Features

### 👥 Dual Role System

✔️ **Patient Portal** – Upload dental images with details
✔️ **Admin Dashboard** – Review submissions, annotate, and generate reports

### 🔐 Authentication & Security

✔️ JWT authentication & role-based access
✔️ Secure file uploads
✔️ Protected API routes

### 🎨 Interactive Annotation

✔️ Tools: Rectangle ◼️, Circle ⭕, Arrow ➡️, Freehand ✍️
✔️ Color selection 🎨
✔️ Real-time canvas editing

### 📄 PDF Reports

✔️ Professional medical reports
✔️ Embedded original + annotated images
✔️ Downloadable by patients

### 📱 Modern UI/UX

✔️ Responsive Tailwind CSS
✔️ Real-time status tracking
✔️ Clean professional design

---

## 🚀 Quick Start

<details>
<summary>📦 Setup Guide</summary>

### Prerequisites

* Node.js 18+
* MongoDB (local or Atlas)
* Git

### Installation

```bash
# Clone repository
git clone https://github.com/yourusername/oralvis-healthcare.git
cd oralvis-healthcare

# First-time setup
npm run setup

# Start dev servers
npm run dev
```

➡️ **App runs at:**

* Frontend → `http://localhost:5173`
* Backend → `http://localhost:5000`

</details>

---

## 🛠 Tech Stack

**Frontend**
🔹 React 18 • Vite • TailwindCSS • React Router • Axios

**Backend**
🔹 Node.js • Express.js • Multer • JWT • Bcrypt • PDFKit

**Database**
🔹 MongoDB • Mongoose

**Utilities**
🔹 Concurrently • ESLint • Prettier

---

## 📸 Screenshots

| Patient Upload                                                                   | Image Annotation                                                                   | Admin Report                                                                             |
| -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| <img width="1919" height="910" alt="Screenshot 2025-09-13 203357" src="https://github.com/user-attachments/assets/78d7b35d-0b1f-4eb7-bae4-5dbe65968eb6" />| <img width="1897" height="901" alt="Screenshot 2025-09-13 203500" src="https://github.com/user-attachments/assets/d33ad9fd-1f50-4e6a-96f1-55c715fcb3d7" />
 | <img width="1894" height="895" alt="Screenshot 2025-09-13 203509" src="https://github.com/user-attachments/assets/95d3aa89-6a5b-4ec8-a5c6-4447a15a97b9" />
 |

---

## 📂 Project Structure

```bash
oralvis-healthcare/
├── client/            # React frontend
│   ├── components/    # Reusable UI components
│   ├── pages/         # Page-level components
│   ├── services/      # API integration
│   └── context/       # Global state (Auth, App)
├── server/            # Node.js backend
│   ├── models/        # MongoDB schemas
│   ├── routes/        # Express routes
│   ├── middleware/    # Auth, validation
│   └── uploads/       # Image storage
└── package.json       # Root scripts
```

---

## 🎯 Application Flow

1️⃣ Patient uploads dental image with details
2️⃣ System stores submission 📂
3️⃣ Admin reviews & annotates 🖍️
4️⃣ System generates PDF 📑
5️⃣ Patient downloads report ⬇️

---

## 📚 API Endpoints

### 🔐 Authentication

* `POST /api/auth/register` → Register
* `POST /api/auth/login` → Login
* `GET /api/auth/me` → Current user

### 🖼️ Submissions

* `POST /api/submissions` → Upload (Patient)
* `GET /api/submissions` → List (Role-based)
* `PUT /api/submissions/:id/annotate` → Annotate (Admin)
* `POST /api/submissions/:id/generate-pdf` → Generate PDF (Admin)
* `GET /api/submissions/:id/download-pdf` → Download PDF

---

## 🔧 Environment Variables

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/oralvis
JWT_SECRET=your-super-secret-jwt-key
NODE_ENV=development
```

---

## 🤝 Contributing

1. Fork 🍴
2. Create branch 🌱 (`feature/amazing-feature`)
3. Commit 📝 (`git commit -m "Add feature"`)
4. Push 🚀 (`git push origin feature/amazing-feature`)
5. Open PR 🔥

---

## 📄 License

📌 MIT — free to use & modify

---

## 👨‍💻 Author

**Vishal Tambi**
🌐 [GitHub](https://github.com/vishal-tambi) • 💼 [LinkedIn](https://linkedin.com/in/vishal-tambi-b180b724b) • 📧 [youremail@example.com](mailto:tambivishal3@gmail.com)

---

## ⭐ Support

If this project helped you:
⭐ **Star the repo** — it means a lot!
