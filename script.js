document.addEventListener('DOMContentLoaded', () => {
    const userInput = document.getElementById('user-input');
    const sendButton = document.getElementById('send-button');
    const chatMessages = document.getElementById('chat-messages');
    const modeCards = document.querySelectorAll('.mode-card');

    let currentMode = '10'; // Default mode

    // Function to add a message to the chat display
    function addMessage(text, sender) {
        const messageWrapper = document.createElement('div');
        messageWrapper.classList.add('flex', 'items-start', 'gap-2'); // Tailwind flex for alignment

        const messageBubble = document.createElement('div');
        messageBubble.classList.add('message-bubble', 'p-2', 'rounded-lg', 'max-w-[80%]', 'break-words', 'shadow-sm', 'text-sm');

        if (sender === 'user') {
            messageWrapper.classList.add('justify-end'); // Push user message to right
            messageBubble.classList.add('user', 'bg-[#f09389]', 'text-[#1b0f0e]');
            messageBubble.textContent = text;
            messageWrapper.appendChild(messageBubble);
        } else {
            messageWrapper.classList.add('justify-start'); // Keep bot message to left
            messageBubble.classList.add('bot', 'bg-[#fbf9f8]', 'text-[#1b0f0e]', 'border', 'border-[#e6d2d0]');

            const aiIcon = document.createElement('div');
            aiIcon.classList.add('w-6', 'h-6', 'bg-[#f09389]', 'rounded-full', 'flex', 'items-center', 'justify-center', 'text-white', 'font-bold', 'text-xs', 'flex-shrink-0');
            aiIcon.textContent = 'AI';
            messageWrapper.appendChild(aiIcon);

            messageBubble.textContent = text;
            messageWrapper.appendChild(messageBubble);
        }
        chatMessages.appendChild(messageWrapper);

        // Scroll to the bottom of the chat
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to show a typing indicator
    function showTypingIndicator() {
        const typingDiv = document.createElement('div');
        typingDiv.id = 'typing-indicator';
        typingDiv.classList.add('message-bubble', 'bot', 'bg-[#fbf9f8]', 'text-[#1b0f0e]', 'border', 'border-[#e6d2d0]', 'flex', 'items-center', 'gap-1', 'pl-3', 'pr-4', 'py-2');

        const aiIcon = document.createElement('div');
        aiIcon.classList.add('w-6', 'h-6', 'bg-[#f09389]', 'rounded-full', 'flex', 'items-center', 'justify-center', 'text-white', 'font-bold', 'text-xs', 'flex-shrink-0', 'mr-2');
        aiIcon.textContent = 'AI';
        typingDiv.appendChild(aiIcon);

        const dotsContainer = document.createElement('div');
        dotsContainer.classList.add('loading-dots');
        dotsContainer.innerHTML = '<span>.</span><span>.</span><span>.</span>';
        typingDiv.appendChild(dotsContainer);

        chatMessages.appendChild(typingDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Function to remove the typing indicator
    function removeTypingIndicator() {
        const typingIndicator = document.getElementById('typing-indicator');
        if (typingIndicator) {
            typingIndicator.remove();
        }
    }


    // Function to send the question to the backend
    async function sendQuestion() {
        const question = userInput.value.trim();
        if (question === '') {
            return; // Don't send empty messages
        }

        addMessage(question, 'user'); // Display user's message immediately
        userInput.value = ''; // Clear input field
        userInput.disabled = true; // Disable input while waiting for response
        sendButton.disabled = true; // Disable button

        showTypingIndicator(); // Show typing indicator

        try {
            // Make sure this URL matches your backend server's address and port
            const backendBaseUrl = 'https://explainit.onrender.com/'; // e.g., 'https://explain-it-backend-XXXXXX-uc.a.run.app'
            const response = await fetch(`${backendBaseUrl}/explain`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    question: question,
                    mode: currentMode // Send the selected mode to the backend
                }),
            });

            removeTypingIndicator(); // Remove typing indicator once response is received

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.error || 'Unknown error'}`);
            }

            const data = await response.json();
            addMessage(data.answer, 'bot'); // Display bot's response

        } catch (error) {
            console.error('Error fetching AI response:', error);
            removeTypingIndicator(); // Remove indicator even on error
            addMessage("Oops! Something went wrong. Please try again later.", 'bot');
        } finally {
            userInput.disabled = false; // Re-enable input
            sendButton.disabled = false; // Re-enable button
            userInput.focus(); // Focus input for next message
        }
    }

    // Event listeners for modes
    modeCards.forEach(card => {
        card.addEventListener('click', () => {
            currentMode = card.dataset.mode;
            // Visually indicate selected mode (optional: add/remove a class for active state)
            modeCards.forEach(mc => mc.classList.remove('border-2', 'border-[#f09389]', 'shadow-md'));
            card.classList.add('border-2', 'border-[#f09389]', 'shadow-md');
            addMessage(`Switched to ${currentMode}-Year-Old Mode. How can I explain something to you?`, 'bot');
        });
    });

    // Set initial mode visual
    document.getElementById(`mode-${currentMode}`).classList.add('border-2', 'border-[#f09389]', 'shadow-md');


    // Event listeners for sending message
    sendButton.addEventListener('click', sendQuestion);
    userInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            sendQuestion();
        }
    });
});
