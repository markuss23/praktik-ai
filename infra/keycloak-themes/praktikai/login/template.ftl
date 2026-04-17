<#macro registrationLayout displayMessage=true displayInfo=false>
<!DOCTYPE html>
<html lang="cs">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${msg("loginTitle", realm.displayName)}</title>
    <link rel="stylesheet" href="${url.resourcesPath}/css/styles.css">
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.0/css/all.min.css">
</head>
<body>
    <div class="login-content-wrapper">
        <#nested "form">
    </div>

    <footer class="praktik-footer">
        <div class="footer-grid">
            <div class="footer-col">
                <div class="footer-logo">
                    <img src="${url.resourcesPath}/img/logo.png" alt="PRAKTIK-AI">
                    <span>PRAKTIK-AI</span>
                </div>
                <p>Datová schránka: 6nhj9dq<br>tel.: +420 475 286 222<br>podatelna@ujep.cz</p>
                <p>IČ: 44555601<br>DIČ: CZ44555601<br>Sídlo: Pasteurova 3544/1, 400 96 Ústí nad Labem</p>
            </div>
            <div class="footer-col">
                <h4>Navigace</h4>
                <ul>
                    <li>Home</li>
                    <li>Moje kurzy</li>
                    <li>Odměny</li>
                    <li>Tutor</li>
                </ul>
            </div>
            <div class="footer-col">
                <h4>Sociální média</h4>
                <div class="social-icons">
                    <a href="#" class="social-icon" aria-label="Facebook"><i class="fab fa-facebook-f"></i></a>
                    <a href="#" class="social-icon" aria-label="Instagram"><i class="fab fa-instagram"></i></a>
                    <a href="#" class="social-icon" aria-label="YouTube"><i class="fab fa-youtube"></i></a>
                    <a href="#" class="social-icon" aria-label="LinkedIn"><i class="fab fa-linkedin-in"></i></a>
                </div>
            </div>
            <div class="footer-col logos">
                <img src="${url.resourcesPath}/img/ujep_logo.jpg" alt="Univerzita J.E. Purkyně v Ústí nad Labem">
                <img src="${url.resourcesPath}/img/ostravska_logo.png" alt="Ostravská Univerzita">
                <img src="${url.resourcesPath}/img/tacr_logo.png" alt="TA ČR">
            </div>
        </div>
        <div class="footer-bottom">
            &copy; 2025 All rights reserved
        </div>
    </footer>
</body>
</html>
</#macro>