# AI StudyMate

**AI StudyMate** is an AI-powered web application designed to provide personalized tutoring assistance to students. The platform allows users to ask academic questions through a text-based interface, and it returns detailed, step-by-step solutions, focusing on subjects like structural mechanics, strength of materials, physics, and mathematics. The AI can also respond to general queries outside these subjects.

## Table of Contents
- [Project Overview](#project-overview)
- [Features](#features)
- [Technologies Used](#technologies-used)
- [Installation](#installation)
- [Usage](#usage)
- [Challenges](#challenges)
- [Future Enhancements](#future-enhancements)
- [Contributing](#contributing)
- [License](#license)
- [Contact](#contact)

## Project Overview
AI StudyMate aims to make learning more accessible by using AI to analyze and solve academic problems through text input. The application provides an interactive learning experience, offering detailed explanations to help students grasp complex concepts. It also retains memory of past interactions to provide context-aware responses.

## Features
- **Text-Based Input:** Users can ask academic or general questions through a text-based interface.
- **Memory Retention:** AI StudyMate remembers previous conversations to offer better context and personalized responses.
- **Subject-Specific Solutions:** Focuses on structural mechanics, strength of materials, physics, and mathematics, but can respond to other queries as well.
- **Step-by-Step Explanations:** Provides detailed breakdowns of problem-solving steps.
- **Recent Chats:** The sidebar displays recent chat history for easy reference.
- **User-Friendly Interface:** Accessible on multiple devices (desktop, tablet, mobile).
- **New Chat Feature:** Allows users to start fresh conversations at any time.
- **Secure Authentication:** Uses Firebase Authentication with a minimum 6-character password policy for security.

## Technologies Used
- **Frontend:** React.js (Vite setup), Material-UI
- **Backend:** Firebase Authentication, Firebase Firestore (for storing chat history)
- **AI/ML Models:** Gemini Pro Vision API for processing and understanding queries

## Installation
To run AI StudyMate locally, follow these steps:

1. Clone the repository:
    ```bash
    git clone https://github.com/yourusername/aistudymate.git
    cd aistudymate
    ```

2. Install dependencies:
    ```bash
    npm install
    ```

3. Set up environment variables:
    - Create a `.env` file in the root directory and add your environment variables (e.g., Firebase credentials, API keys).

4. Run the development server:
    ```bash
    npm start
    ```

## Usage
1. Open the application in your browser:
    ```
    http://localhost:3000
    ```

2. Sign in using your credentials.

3. Start a conversation by asking a question through the text input.

4. Review the AI's detailed response and continue the conversation or start a new one.

5. View recent chats on the sidebar for quick access to past interactions.

## Challenges
- **Conversation Memory:** Ensuring the AI accurately remembers and references previous interactions.
- **Security:** Implementing robust security measures, including Firebase Authentication and password policies.
- **Scalability:** Handling increasing user interactions and maintaining performance.

## Future Enhancements
- **MVP:** Adding image recognition for question input (currently in development).
- **Expand Subject Coverage:** Include more disciplines beyond the initial focus areas.
- **Voice Interaction:** Enable voice-based questions for a more interactive experience.
- **User Progress Tracking:** Implement features to track user progress and provide personalized feedback.

## Contributing
Contributions are welcome! Please fork the repository and create a pull request with your changes. Ensure your code follows the existing coding standards.

## License
This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contact
For questions or feedback, please contact:
- **Name:** Abraham Folorunso
- **Email:** abrahamfolorunso6@gmail.com
