<#import "template.ftl" as layout>
<@layout.registrationLayout; section>
    <#if section = "form">
        <div class="praktik-card">
            <div class="praktik-logo-header">
                <img src="${url.resourcesPath}/img/logo.png" alt="PRAKTIK-AI">
            </div>
            <h1 class="praktik-title">Odhlásit se?</h1>
            <p class="logout-text">Opravdu se chceš odhlásit z PRAKTIK-AI?</p>

            <form action="${url.logoutConfirmAction}" method="POST">
                <input type="hidden" name="session_code" value="${logoutConfirm.code}">
                <div id="kc-form-buttons">
                    <input class="btn-primary" name="confirmLogout" id="kc-logout" type="submit" value="Odhlásit se" />
                </div>
            </form>

            <div class="form-links">
                <#if client?? && client.baseUrl?has_content>
                    <p><a href="${client.baseUrl}">← Zpět na aplikaci</a></p>
                </#if>
            </div>
        </div>
    </#if>
</@layout.registrationLayout>
