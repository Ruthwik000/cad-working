# AI Assistant Feature

## Overview
The OpenSCAD Playground now includes an AI-powered assistant that can generate OpenSCAD code based on natural language descriptions.

## Features
- **Chat Interface**: Cursor-like chat interface in a sidebar
- **Natural Language Input**: Describe what you want to create (e.g., "create a realistic car", "generate a horse", "make a wheel")
- **Automatic Code Generation**: Uses Google's Gemini 2.0 Flash Exp model to generate detailed OpenSCAD code
- **Direct Integration**: Generated code is automatically inserted into the editor
- **Persistent API Key**: Your Gemini API key is stored locally in your browser

## How to Use

1. **Get a Gemini API Key**
   - Visit [Google AI Studio](https://aistudio.google.com/app/apikey)
   - Create a free API key

2. **Open the AI Assistant**
   - Click the "AI" button with the sparkles icon (✨) in the header
   - The chat panel will slide in from the left

3. **Enter Your API Key**
   - On first use, you'll be prompted to enter your Gemini API key
   - The key is saved in your browser's localStorage for future use

4. **Generate Models**
   - Type what you want to create in the chat input
   - Press Enter to send (Shift+Enter for new line)
   - The AI will generate OpenSCAD code and insert it into the editor
   - The model will automatically render in the viewer

## Example Prompts
- "Create a realistic car with wheels and windows"
- "Generate a detailed horse model"
- "Make a gear wheel with 20 teeth"
- "Design a coffee mug with a handle"
- "Create a chess piece - a knight"

## Technical Details
- **Model**: gemini-2.0-flash-exp
- **API**: Google Generative AI API
- **System Prompt**: Optimized to generate realistic, detailed, and functional OpenSCAD code
- **Code Extraction**: Automatically extracts code from markdown code blocks if present

## Privacy
- Your API key is stored only in your browser's localStorage
- No data is sent to any server except Google's Gemini API
- All communication is direct between your browser and Google's API

## Troubleshooting
- **"Error: API Error: 401"**: Your API key is invalid or expired
- **"Error: API Error: 429"**: You've exceeded the API rate limit
- **No code generated**: Try rephrasing your prompt to be more specific
- **Code doesn't render**: Check the console for OpenSCAD syntax errors
