document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('.showPass').forEach(button => {
        button.addEventListener('click', function () {
            const passwordInput = button.previousElementSibling;

            if (passwordInput.type === 'password') {
                passwordInput.type = 'text';
                button.textContent = 'hide';
            } else {
                passwordInput.type = 'password';
                button.textContent = 'show';
            }
        });
    });
});
