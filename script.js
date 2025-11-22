document.addEventListener('DOMContentLoaded', function() {
    const webhookUrlInput = document.getElementById('webhookUrl');
    const usernameInput = document.getElementById('username');
    const messageInput = document.getElementById('message');
    const sendButton = document.getElementById('sendButton');
    const statusDiv = document.getElementById('status');

    // Function to update status message
    function updateStatus(message, isError = false) {
        statusDiv.textContent = message;
        statusDiv.className = 'status ' + (isError ? 'error' : 'success');
        statusDiv.style.display = 'block';
    }

    // Function to send message to Discord webhook
    async function sendToDiscord() {
        const webhookUrl = webhookUrlInput.value.trim();
        const username = usernameInput.value.trim();
        const message = messageInput.value.trim();

        // Validate inputs
        if (!webhookUrl) {
            updateStatus('Please enter a webhook URL', true);
            return;
        }

        if (!username) {
            updateStatus('Please enter a username', true);
            return;
        }

        if (!message) {
            updateStatus('Please enter a message', true);
            return;
        }

        // Disable button and show loading state
        sendButton.disabled = true;
        sendButton.textContent = 'Sending...';

        try {
            const response = await fetch(webhookUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    username: username,
                    content: message
                })
            });

            if (response.ok) {
                updateStatus('Message sent successfully to Discord!');
                // Clear the message field after successful send
                messageInput.value = '';
            } else {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to send message to Discord');
            }
        } catch (error) {
            console.error('Error:', error);
            updateStatus(`Error: ${error.message}`, true);
        } finally {
            // Re-enable button and reset text
            sendButton.disabled = false;
            sendButton.textContent = 'Send to Discord';
            
            // Clear status after 5 seconds
            setTimeout(() => {
                statusDiv.style.display = 'none';
            }, 5000);
        }
    }

    // Add click event listener to the send button
    sendButton.addEventListener('click', sendToDiscord);

    // Allow sending message with Ctrl+Enter
    messageInput.addEventListener('keydown', function(e) {
        if (e.ctrlKey && e.key === 'Enter') {
            sendToDiscord();
        }
    });

    // Add a simple animation when the page loads
    document.body.style.opacity = '0';
    setTimeout(() => {
        document.body.style.transition = 'opacity 0.5s ease-in-out';
        document.body.style.opacity = '1';
    }, 100);
});
