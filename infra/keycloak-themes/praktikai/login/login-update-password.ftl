<#import "template.ftl" as layout>
<@layout.registrationLayout displayMessage=!messagesPerField.existsError('password','password-confirm'); section>
    <#if section = "form">
        <div class="praktik-card">
            <div class="praktik-logo-header">
                <img src="${url.resourcesPath}/img/logo.png" alt="PRAKTIK-AI">
            </div>
            <h1 class="praktik-title">Nové heslo</h1>
            <p class="reset-description">Zadejte své nové heslo.</p>

            <form id="kc-passwd-update-form" action="${url.loginAction}" method="post">
                <input type="text" id="username" name="username" value="${username}" autocomplete="username" readonly="readonly" style="display:none;" />

                <div class="form-group">
                    <label for="password-new">Nové heslo</label>
                    <input type="password" id="password-new"
                           class="form-control <#if messagesPerField.existsError('password')>field-error</#if>"
                           name="password-new" autofocus autocomplete="new-password" />
                    <#if messagesPerField.existsError('password')>
                        <span class="field-error-msg">${kcSanitize(messagesPerField.get('password'))?no_esc}</span>
                    </#if>
                </div>

                <div class="form-group">
                    <label for="password-confirm">Potvrďte heslo</label>
                    <input type="password" id="password-confirm"
                           class="form-control <#if messagesPerField.existsError('password-confirm')>field-error</#if>"
                           name="password-confirm" autocomplete="new-password" />
                    <#if messagesPerField.existsError('password-confirm')>
                        <span class="field-error-msg">${kcSanitize(messagesPerField.get('password-confirm'))?no_esc}</span>
                    </#if>
                </div>

                <div id="kc-form-buttons">
                    <input class="btn-primary" type="submit" value="Uložit heslo" />
                </div>
            </form>

            <#if message?has_content && (message.type = 'error' || message.type = 'warning' || message.type = 'success' || message.type = 'info')>
                <div class="alert alert-${message.type}">${kcSanitize(message.summary)?no_esc}</div>
            </#if>
        </div>
    </#if>
</@layout.registrationLayout>
