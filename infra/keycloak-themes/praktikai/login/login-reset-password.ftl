<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "form">
        <div class="praktik-card">
            <div class="praktik-logo-header">
                <img src="${url.resourcesPath}/img/logo.png" alt="PRAKTIK-AI">
            </div>
            <h1 class="praktik-title">Zapomenuté heslo</h1>
            <p class="reset-description">Zadejte svůj e-mail a pošleme vám odkaz pro obnovu hesla.</p>

            <form id="kc-reset-password-form" action="${url.loginAction}" method="post">
                <div class="form-group">
                    <label for="username">E-mail</label>
                    <input type="email" id="username" name="username" class="form-control"
                           value="${(auth.attemptedUsername!'')}" autofocus autocomplete="email" />
                </div>

                <div id="kc-form-buttons">
                    <input class="btn-primary" type="submit" value="Odeslat odkaz" />
                </div>
            </form>

            <#if message?has_content && (message.type = 'error' || message.type = 'warning' || message.type = 'success' || message.type = 'info')>
                <div class="alert alert-${message.type}">${kcSanitize(message.summary)?no_esc}</div>
            </#if>

            <#if messagesPerField.existsError('username')>
                <div class="alert alert-error">
                    <span>${kcSanitize(messagesPerField.get('username'))?no_esc}</span>
                </div>
            </#if>

            <div class="form-links">
                <p><a href="${url.loginUrl}" class="link-subtle">← Zpět na přihlášení</a></p>
            </div>
        </div>
    </#if>
</@layout.registrationLayout>
