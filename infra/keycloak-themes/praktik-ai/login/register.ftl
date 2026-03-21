<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "form">
        <div class="praktik-card">
            <div class="praktik-logo-header">
                <img src="${url.resourcesPath}/img/logo.png" alt="PRAKTIK-AI">
            </div>
            <h1 class="praktik-title">Pojďme začít</h1>

            <#if message?? && message.type = "error">
                <div class="alert alert-error">${kcSanitize(message.summary)?no_esc}</div>
            </#if>

            <form id="kc-register-form" action="${url.registrationAction}" method="post" onsubmit="return validateRegister()">
                <div class="form-group">
                    <label for="firstName">Jméno</label>
                    <input type="text" id="firstName" class="form-control <#if messagesPerField.existsError('firstName')>field-error</#if>"
                           name="firstName" value="${(register.formData.firstName!'')}" autofocus />
                    <#if messagesPerField.existsError('firstName')>
                        <span class="field-error-msg">${kcSanitize(messagesPerField.get('firstName'))?no_esc}</span>
                    </#if>
                </div>

                <div class="form-group">
                    <label for="lastName">Příjmení</label>
                    <input type="text" id="lastName" class="form-control <#if messagesPerField.existsError('lastName')>field-error</#if>"
                           name="lastName" value="${(register.formData.lastName!'')}" />
                    <#if messagesPerField.existsError('lastName')>
                        <span class="field-error-msg">${kcSanitize(messagesPerField.get('lastName'))?no_esc}</span>
                    </#if>
                </div>

                <div class="form-group">
                    <label for="username">Uživatelské jméno</label>
                    <input type="text" id="username" class="form-control <#if messagesPerField.existsError('username')>field-error</#if>"
                           name="username" value="${(register.formData.username!'')}" autocomplete="username" />
                    <#if messagesPerField.existsError('username')>
                        <span class="field-error-msg">${kcSanitize(messagesPerField.get('username'))?no_esc}</span>
                    </#if>
                </div>

                <div class="form-group">
                    <label for="email">Email</label>
                    <input type="email" id="email" class="form-control <#if messagesPerField.existsError('email')>field-error</#if>"
                           name="email" value="${(register.formData.email!'')}" autocomplete="email" />
                    <#if messagesPerField.existsError('email')>
                        <span class="field-error-msg">${kcSanitize(messagesPerField.get('email'))?no_esc}</span>
                    </#if>
                </div>

                <div class="form-group">
                    <label for="password">Heslo</label>
                    <input type="password" id="password" class="form-control <#if messagesPerField.existsError('password')>field-error</#if>"
                           name="password" autocomplete="new-password" />
                    <#if messagesPerField.existsError('password')>
                        <span class="field-error-msg">${kcSanitize(messagesPerField.get('password'))?no_esc}</span>
                    </#if>
                </div>

                <div class="form-group">
                    <label for="password-confirm">Potvrďte heslo</label>
                    <input type="password" id="password-confirm" class="form-control <#if messagesPerField.existsError('password-confirm')>field-error</#if>"
                           name="password-confirm" />
                    <#if messagesPerField.existsError('password-confirm')>
                        <span class="field-error-msg">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</span>
                    </#if>
                </div>

                <div class="checkbox-group">
                    <input type="checkbox" id="gdpr" name="gdpr">
                    <label for="gdpr">Souhlasím s <a href="#" class="link-bold">GDPR</a></label>
                </div>
                <div id="gdpr-error" class="alert alert-error" style="display:none;">Pro registraci musíte souhlasit s GDPR.</div>

                <div id="kc-form-buttons">
                    <input class="btn-primary" type="submit" value="Zaregistrovat se" />
                </div>
            </form>

            <script>
            function validateRegister() {
                var gdpr = document.getElementById('gdpr');
                var err  = document.getElementById('gdpr-error');
                if (!gdpr.checked) {
                    err.style.display = 'block';
                    gdpr.focus();
                    return false;
                }
                err.style.display = 'none';
                return true;
            }
            </script>

            <div class="form-links">
                <p>Už máte účet? <a href="${url.loginUrl}">Přihlásit se</a></p>
            </div>
        </div>
    </#if>
</@layout.registrationLayout>