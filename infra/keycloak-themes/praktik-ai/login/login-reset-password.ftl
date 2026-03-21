<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username'); section>
    <#if section = "form">
        <div class="praktik-card">
            <div class="praktik-logo-header">
                <img src="${url.resourcesPath}/img/logo.png" alt="PRAKTIK-AI">
            </div>
            <h1 class="praktik-title">Zapomenuté heslo</h1>
            <p class="reset-description">Zadejte svůj e-mail a pošleme vám odkaz pro obnovu hesla.</p>

            <#if messagesPerField.existsError('username')>
                <div class="alert alert-error">
                    <span>${kcSanitize(messagesPerField.get('username'))?no_esc}</span>
                </div>
            </#if>

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

            <div class="form-links">
                <p><a href="${url.loginUrl}" class="link-subtle">← Zpět na přihlášení</a></p>
            </div>
        </div>
    </#if>
</@layout.registrationLayout>
