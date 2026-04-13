<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('username','password') displayInfo=realm.password && realm.registrationAllowed && !registrationDisabled??; section>
    <#if section = "form">
        <div class="praktik-card">
            <div class="praktik-logo-header">
                <img src="${url.resourcesPath}/img/logo.png" alt="PRAKTIK-AI">
            </div>
            <h1 class="praktik-title">Vítej zpět!</h1>

            <form id="kc-form-login" onsubmit="login.disabled = true; return true;" action="${url.loginAction}" method="post">
                <div class="form-group">
                    <label for="username">Email</label>
                    <input tabindex="1" id="username" class="form-control" name="username" value="${(login.username!'')}"  type="text" autofocus autocomplete="off" />
                </div>

                <div class="form-group">
                    <label for="password">Heslo</label>
                    <input tabindex="2" id="password" class="form-control" name="password" type="password" autocomplete="off" />
                </div>

                <div id="kc-form-buttons">
                    <input tabindex="4" class="btn-primary" name="login" id="kc-login" type="submit" value="Přihlásit se"/>
                </div>
            </form>

            <#if message?has_content && (message.type = 'error' || message.type = 'warning' || message.type = 'success' || message.type = 'info')>
                <div class="alert alert-${message.type}">${kcSanitize(message.summary)?no_esc}</div>
            </#if>

            <div class="form-links">
                <#if realm.resetPasswordAllowed>
                    <p><a href="${url.loginResetCredentialsUrl}" class="link-subtle">Zapomenuté heslo?</a></p>
                </#if>
                <#if realm.password && realm.registrationAllowed && !registrationDisabled??>
                    <p>Nemáte účet? <a href="${url.registrationUrl}" class="link-bold">Zaregistrovat se</a></p>
                </#if>
            </div>
        </div>
    </#if>
</@layout.registrationLayout>