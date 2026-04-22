/**
 * quote-form.js — Quote form validation + Google Sheets submission + WhatsApp redirect
 * Works with both direct page load and SPA navigation.
 */
(function () {
  function initQuoteForm() {
    var form = document.getElementById("quote-form");
    if (!form || form.dataset.quoteFormBound) return;
    form.dataset.quoteFormBound = "1";
    form.dataset.interactionBound = "1";

    form.addEventListener("submit", function (e) {
      e.preventDefault();

      // Required fields
      var required = ["q-company", "q-contact", "q-phone", "q-email", "q-country", "q-equipment-type"];
      var valid = true;
      required.forEach(function (id) {
        var el = document.getElementById(id);
        if (!el) return;
        if (!el.value.trim()) {
          el.classList.add("border-red-500");
          valid = false;
        } else {
          el.classList.remove("border-red-500");
        }
      });

      // Email validation
      var emailEl = document.getElementById("q-email");
      if (emailEl && emailEl.value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailEl.value)) {
        emailEl.classList.add("border-red-500");
        valid = false;
      }

      // Consent validation
      var consentEl = document.getElementById("q-consent");
      if (consentEl && !consentEl.checked) {
        valid = false;
        if (typeof window.showNotification === "function") {
          window.showNotification("请先同意隐私政策", "error");
        }
        return;
      }

      if (!valid) {
        if (typeof window.showNotification === "function") {
          window.showNotification("请填写所有必填项", "error");
        }
        return;
      }

      // Build WhatsApp message
      var company = document.getElementById("q-company").value;
      var contact = document.getElementById("q-contact").value;
      var phone = document.getElementById("q-phone").value;
      var email = document.getElementById("q-email").value;
      var country = document.getElementById("q-country");
      var countryText = country.options[country.selectedIndex].text;
      var equipType = document.getElementById("q-equipment-type");
      var equipText = equipType.options[equipType.selectedIndex].text;
      var quantity = document.getElementById("q-quantity").value || "未指定";
      var capacity = document.getElementById("q-capacity");
      var capacityText = capacity.value ? capacity.options[capacity.selectedIndex].text : "未指定";
      var budget = document.getElementById("q-budget");
      var budgetText = budget.value ? budget.options[budget.selectedIndex].text : "未指定";
      var message = document.getElementById("q-message").value || "无";

      var msg =
        "🔧 YuKoLi 智能厨具询价\n" +
        "━━━━━━━━━━━━━━\n" +
        "🏢 公司: " + company + "\n" +
        "👤 联系人: " + contact + "\n" +
        "📞 电话: " + phone + "\n" +
        "📧 邮箱: " + email + "\n" +
        "🌍 国家: " + countryText + "\n" +
        "━━━━━━━━━━━━━━\n" +
        "🍽️ 设备类型: " + equipText + "\n" +
        "📦 数量: " + quantity + "\n" +
        "🏭 厨房规模: " + capacityText + "\n" +
        "💰 预算: " + budgetText + "\n" +
        "📝 详细需求: " + message;

      // Submit to Google Sheets (fire-and-forget)
      var formData = {
        formType: "quote_form",
        company: company,
        contact: contact,
        phone: phone,
        email: email,
        country: countryText,
        equipmentType: equipText,
        quantity: quantity,
        kitchenCapacity: capacityText,
        budget: budgetText,
        message: message,
        language: (window.translationManager && window.translationManager.currentLang) || navigator.language,
        pageUrl: location.href
      };
      fetch("https://script.google.com/macros/s/AKfycbyikM1ArEFhJhQUSAp6l4DHJcGzDDK1cckL-KOrVbjipoMGSKsOOlhFWJGTPB6qOys/exec", {
        method: "POST",
        mode: "no-cors",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      }).catch(function () {});

      // Open WhatsApp
      var wa = (window.Contacts && window.Contacts.whatsapp) || "8613163756465";
      window.open("https://wa.me/" + wa + "?text=" + encodeURIComponent(msg), "_blank");

      if (typeof window.showNotification === "function") {
        window.showNotification("正在跳转到 WhatsApp，请发送询价信息", "success");
      }

      // Redirect to thank-you
      setTimeout(function () { location.href = "/thank-you/"; }, 1500);
    });
  }

  // Bind on DOM ready + SPA navigation
  if (document.readyState !== "loading") initQuoteForm();
  else document.addEventListener("DOMContentLoaded", initQuoteForm);
  document.addEventListener("spa:load", function () {
    setTimeout(initQuoteForm, 100);
  });
})();
