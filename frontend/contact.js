// Функционал для секции контактов

document.addEventListener('DOMContentLoaded', () => {
    initContactSection();
});

function initContactSection() {
    const copyEmailBtn = document.getElementById('copyEmailBtn');
    const emailValue = document.getElementById('emailValue');
    const copySuccess = document.getElementById('copySuccess');
    
    if (copyEmailBtn && emailValue) {
        copyEmailBtn.addEventListener('click', async () => {
            const email = emailValue.textContent;
            
            try {
                await navigator.clipboard.writeText(email);
                
                // Показываем сообщение об успехе
                if (copySuccess) {
                    copySuccess.style.display = 'inline-block';
                    copyEmailBtn.style.display = 'none';
                    
                    setTimeout(() => {
                        copySuccess.style.display = 'none';
                        copyEmailBtn.style.display = 'inline-block';
                    }, 2000);
                }
            } catch (err) {
                console.error('Ошибка копирования:', err);
                // Fallback для старых браузеров
                const textArea = document.createElement('textarea');
                textArea.value = email;
                textArea.style.position = 'fixed';
                textArea.style.opacity = '0';
                document.body.appendChild(textArea);
                textArea.select();
                try {
                    document.execCommand('copy');
                    if (copySuccess) {
                        copySuccess.style.display = 'inline-block';
                        copyEmailBtn.style.display = 'none';
                        setTimeout(() => {
                            copySuccess.style.display = 'none';
                            copyEmailBtn.style.display = 'inline-block';
                        }, 2000);
                    }
                } catch (fallbackErr) {
                    console.error('Fallback копирование не удалось:', fallbackErr);
                } finally {
                    document.body.removeChild(textArea);
                }
            }
        });
    }
}

