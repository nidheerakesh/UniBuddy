// --- Theme Logic ---
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme') || 'green-mist';
    setTheme(savedTheme);

    selectedLanguage = localStorage.getItem('selectedLanguage') || 'english';
    selectedTone = localStorage.getItem('selectedTone') || 'neutral';
    languageSelect.value = selectedLanguage;
    toneSelect.value = selectedTone;

    updateModeCardStyling(selectedMode);
});

const themeButtons = document.querySelectorAll('.theme-button');
const appBody = document.getElementById('app-body');

function setTheme(themeName) {
    const validThemes = ['cherry-blossom-pink', 'dark-mode', 'light-pastel', 'green-mist'];
    if (!validThemes.includes(themeName)) {
        themeName = validThemes.includes(localStorage.getItem('theme')) ? localStorage.getItem('theme') : 'green-mist';
    }

    appBody.classList.remove('cherry-blossom-pink-theme', 'dark-mode-theme', 'light-pastel-theme');
    if (themeName === 'cherry-blossom-pink') appBody.classList.add('cherry-blossom-pink-theme');
    else if (themeName === 'dark-mode') appBody.classList.add('dark-mode-theme');
    else if (themeName === 'light-pastel') appBody.classList.add('light-pastel-theme');

    localStorage.setItem('theme', themeName);
    themeButtons.forEach(button => {
        button.classList.toggle('selected', button.dataset.theme === themeName);
    });
}

themeButtons.forEach(button => {
    button.addEventListener('click', () => {
        setTheme(button.dataset.theme);
    });
});

// --- Global Elements ---
const explainButton = document.getElementById('send-button');
const inputBox = document.getElementById('user-input');
const outputBox = document.getElementById('chat-messages');
const charCounter = document.getElementById('char-counter');
const copyButton = document.getElementById('copy-button');
const languageSelect = document.getElementById('language-select');
const toneSelect = document.getElementById('tone-select');
const modeCards = document.querySelectorAll('.mode-card');

const backendBaseUrl = 'http://127.0.0.1:5000';

let chatHistory = [];
let isFirstExplanationTurn = true;
let selectedLanguage = 'english';
let selectedTone = 'neutral';
let selectedMode = localStorage.getItem('selectedMode') || '5';

// --- Display Chat Messages ---
function displayMessage(text, sender, addToHistory = true) {
    const messageBubble = document.createElement('div');
    messageBubble.classList.add('message-bubble', sender);

    if (sender === 'bot') {
        const aiSpan = document.createElement('span');
        aiSpan.classList.add('w-6', 'h-6', 'rounded-full', 'flex', 'items-center', 'justify-center', 'text-white', 'font-bold', 'text-xs', 'flex-shrink-0', 'mr-2');
        aiSpan.textContent = 'AI';
        messageBubble.appendChild(aiSpan);

        const formattedText = marked.parse(text);
        messageBubble.innerHTML += formattedText;
        if (addToHistory) chatHistory.push({ role: 'model', text: text });
    } else {
        const textNode = document.createTextNode(text);
        messageBubble.appendChild(textNode);
        if (addToHistory) chatHistory.push({ role: 'user', text: text });
    }

    outputBox.appendChild(messageBubble);
    outputBox.scrollTop = outputBox.scrollHeight;
}

// --- Loading Indicator ---
let loadingMessageElement = null;

function showLoadingIndicator() {
    loadingMessageElement = document.createElement('div');
    loadingMessageElement.classList.add('message-bubble', 'bot');
    loadingMessageElement.innerHTML = `
        <span class="w-6 h-6 bg-[var(--accent-primary)] rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0 mr-2">AI</span>
        <span class="loading-dots"><span>.</span><span>.</span><span>.</span></span>
    `;
    outputBox.appendChild(loadingMessageElement);
    outputBox.scrollTop = outputBox.scrollHeight;
}

function hideLoadingIndicator() {
    if (loadingMessageElement) {
        outputBox.removeChild(loadingMessageElement);
        loadingMessageElement = null;
    }
}

// --- Character Counter ---
const MAX_CHAR_LENGTH = 200;

function updateCharCounter() {
    const currentLength = inputBox.value.length;
    charCounter.textContent = `${currentLength}/${MAX_CHAR_LENGTH}`;

    if (currentLength > MAX_CHAR_LENGTH) {
        inputBox.value = inputBox.value.substring(0, MAX_CHAR_LENGTH);
        charCounter.textContent = `${MAX_CHAR_LENGTH}/${MAX_CHAR_LENGTH}`;
        charCounter.style.color = 'red';
    } else {
        charCounter.style.color = '';
    }
}
inputBox.addEventListener('input', updateCharCounter);
updateCharCounter();

// --- Copy to Clipboard ---
copyButton.addEventListener('click', async () => {
    const botMessages = outputBox.querySelectorAll('.message-bubble.bot');
    if (botMessages.length === 0) return alert("No explanation to copy yet!");

    let textToCopy = '';
    const lastBotMsg = chatHistory.slice().reverse().find(m => m.role === 'model');
    if (lastBotMsg) {
        textToCopy = lastBotMsg.text;
    }

    if (!textToCopy) {
        const lastBotMessageElement = botMessages[botMessages.length - 1];
        const aiSpan = lastBotMessageElement.querySelector('span');
        textToCopy = lastBotMessageElement.textContent;
        if (aiSpan) textToCopy = textToCopy.substring(aiSpan.textContent.length).trim();
    }

    try {
        await navigator.clipboard.writeText(textToCopy);
        copyButton.textContent = 'Copied!';
    } catch {
        copyButton.textContent = 'Failed to Copy!';
    } finally {
        setTimeout(() => copyButton.textContent = 'Copy Explanation', 2000);
    }
});

// --- Language & Tone ---
languageSelect.addEventListener('change', () => {
    selectedLanguage = languageSelect.value;
    localStorage.setItem('selectedLanguage', selectedLanguage);
    displayMessage(`Language set to ${selectedLanguage}.`, 'bot', false);
    setTheme(localStorage.getItem('theme'));
});

toneSelect.addEventListener('change', () => {
    selectedTone = toneSelect.value;
    localStorage.setItem('selectedTone', selectedTone);
    displayMessage(`Tone set to ${selectedTone}.`, 'bot', false);
    setTheme(localStorage.getItem('theme'));
});

// --- Explain Button ---
explainButton.addEventListener('click', async () => {
    const query = inputBox.value.trim();
    if (!query) return displayMessage("Please enter something to explain.", 'bot', false);

    displayMessage(query, 'user');
    inputBox.value = '';
    updateCharCounter();

    hideLoadingIndicator();
    showLoadingIndicator();

    try {
        const response = await fetch(`${backendBaseUrl}/explain`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                prompt: query,
                history: chatHistory.slice(0, -1),
                language: selectedLanguage,
                tone: selectedTone,
                mode: selectedMode,
                is_first_turn: isFirstExplanationTurn
            }),
        });

        hideLoadingIndicator();
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        displayMessage(data.explanation, 'bot');
        isFirstExplanationTurn = false;
    } catch (error) {
        console.error('Error fetching explanation:', error);
        hideLoadingIndicator();
        displayMessage(`Error: Could not get explanation. ${error.message}`, 'bot', false);
    }
});

// --- Mode Selection ---
function updateModeCardStyling(selectedId) {
    // Highlight selected mode card
    modeCards.forEach(card => card.classList.remove('active'));
    const activeCard = document.getElementById(`mode-${selectedId}`);
    if (activeCard) activeCard.classList.add('active');

    // Save selected mode
    localStorage.setItem('selectedMode', selectedId);
    selectedMode = selectedId;

    // Reset chat UI
    outputBox.innerHTML = '';
    chatHistory = [];
    isFirstExplanationTurn = true;

    // Load chat history or greeting
    if (selectedId === 'genz') {
        const saved = localStorage.getItem('genzHistory');
        if (saved) {
            chatHistory = JSON.parse(saved);
            chatHistory.forEach(msg =>
                displayMessage(msg.text, msg.role === 'model' ? 'bot' : 'user', false)
            );
        } else {
            displayMessage("Hey I’m your AI buddy 👋", 'bot', false);
        }
    } else if (selectedId === 'nerd') {
        const saved = localStorage.getItem('nerdHistory');
        if (saved) {
            chatHistory = JSON.parse(saved);
            chatHistory.forEach(msg =>
                displayMessage(msg.text, msg.role === 'model' ? 'bot' : 'user', false)
            );
        } else {
            displayMessage("Hi! I'm your personal college guide 🎓", 'bot', false);
        }
    } else {
        displayMessage("Hello! I’m the UniBuddy. Ask me anything and I’ll explain it to you in a simple way.", 'bot', false);
    }

    // Friendly confirmation
    const modeLabel = selectedId === 'genz' ? 'Buddy Chat'
                     : selectedId === 'nerd' ? 'College Guide'
                     : `${selectedId}-year-old`;
    displayMessage(`Explanation mode changed to ${modeLabel}.`, 'bot', false);
}

// Add click listeners to mode cards
modeCards.forEach(card => {
    card.addEventListener('click', () => {
        const newMode = card.dataset.mode;
        if (selectedMode !== newMode) {
            updateModeCardStyling(newMode);
        }
    });
});

// --- Save Buddy/Nerd Chats ---
window.addEventListener('beforeunload', () => {
    if (selectedMode === 'genz') localStorage.setItem('genzHistory', JSON.stringify(chatHistory));
    if (selectedMode === 'nerd') localStorage.setItem('nerdHistory', JSON.stringify(chatHistory));
});

// --- To-Do Sidebar Logic ---
const toggleTodoBtn = document.getElementById('toggle-todo');
const closeTodoBtn = document.getElementById('close-todo');
const todoSidebar = document.getElementById('todo-sidebar');

toggleTodoBtn.addEventListener('click', () => {
  todoSidebar.classList.toggle('-translate-x-full');
});
closeTodoBtn.addEventListener('click', () => {
  todoSidebar.classList.add('-translate-x-full');
});

// --- Task Logic ---
const taskInput = document.getElementById('new-task-input');
const addTaskBtn = document.getElementById('add-task-btn');
const taskList = document.getElementById('task-list');

let tasks = JSON.parse(localStorage.getItem('todoTasks')) || [];

function renderTasks() {
  taskList.innerHTML = '';
  tasks.forEach((task, index) => {
    const li = document.createElement('li');
    li.className = `flex items-center justify-between px-3 py-2 rounded-lg ${
      task.done ? 'bg-green-100 dark:bg-green-800 line-through text-gray-400' : 'bg-gray-100 dark:bg-gray-700'
    }`;

    const span = document.createElement('span');
    span.textContent = task.text;
    span.className = 'flex-1 cursor-pointer';
    span.onclick = () => toggleTask(index);

    const delBtn = document.createElement('button');
    delBtn.innerHTML = '🗑️';
    delBtn.className = 'ml-2 hover:text-red-500';
    delBtn.onclick = () => deleteTask(index);

    li.appendChild(span);
    li.appendChild(delBtn);
    taskList.appendChild(li);
  });
  localStorage.setItem('todoTasks', JSON.stringify(tasks));
}

function addTask() {
  const text = taskInput.value.trim();
  if (text) {
    tasks.push({ text, done: false });
    taskInput.value = '';
    renderTasks();
  }
}

function toggleTask(index) {
  tasks[index].done = !tasks[index].done;
  renderTasks();
}

function deleteTask(index) {
  tasks.splice(index, 1);
  renderTasks();
}

addTaskBtn.addEventListener('click', addTask);
taskInput.addEventListener('keypress', e => {
  if (e.key === 'Enter') addTask();
});

renderTasks();
