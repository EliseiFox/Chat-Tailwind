document.addEventListener('DOMContentLoaded', () => {
    const linksContainer = document.getElementById('links-container');

    // Делаем запрос к нашему API
    fetch('/api/links')
        .then(response => response.json())
        .then(links => {
            // Очищаем контейнер на всякий случай
            linksContainer.innerHTML = ''; 

            // Для каждой ссылки создаем HTML-элемент и добавляем на страницу
            links.forEach(link => {
                const linkElement = document.createElement('a');
                linkElement.href = link.url;
                linkElement.target = '_blank'; // Открывать в новой вкладке
                linkElement.rel = 'noopener noreferrer';
                // Используем классы Tailwind для стилизации
                linkElement.className = 'block w-full bg-blue-500 hover:bg-blue-600 text-white font-bold py-3 px-4 rounded-lg transition duration-300 ease-in-out transform hover:-translate-y-1';
                linkElement.textContent = link.title;

                linksContainer.appendChild(linkElement);
            });
        })
        .catch(error => {
            console.error('Ошибка при загрузке ссылок:', error);
            linksContainer.innerHTML = '<p class="text-red-500">Не удалось загрузить ссылки.</p>';
        });
});