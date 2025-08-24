# Regex GUI

Drag-and-drop regular expression builder built with React + Vite.

![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg) ![Node Version](https://img.shields.io/badge/node-%3E%3D18-green)

## Table of Contents
- [Screenshot](#screenshot)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Prerequisites](#prerequisites)
- [Installation & Scripts](#installation--scripts)
- [Usage](#usage)
- [Contributing](#contributing)
- [License](#license)

## Screenshot
![Regex GUI interface](docs/screenshot.png)

## Features
- Drag-and-drop blocks for building expressions
- Live regex preview
- Test string highlighting
- Template library:
  - Email
  - Phone
  - URL
  - IPv4
  - Date
  - Time
  - Credit card
  - Hex color
  - File extension
  - UUID
  - IPv6
  - Username
  - Password
- Copy regex to clipboard

## Tech Stack
- React 18
- Vite
- TailwindCSS
- @dnd-kit

## Prerequisites
- Node.js >= 18
- npm

## Installation & Scripts
```bash
npm install
npm run dev     # start development server
npm run build   # build for production
npm run preview # locally preview production build
```

## Usage
1. Drag blocks into the editor to compose your expression.
2. Edit blocks to fine-tune patterns.
3. Toggle regex flags.
4. Apply templates for common patterns.
5. Copy the resulting regex to your clipboard.

## Contributing
Issues and pull requests welcome. Feel free to contribute!

## License
[ISC](https://opensource.org/licenses/ISC)