/* =============================================
   LUMEA SHIFT — cart.js（ご注文フォーム）
   - 支払い方法の切り替え
   - 入力バリデーション（項目別メッセージ）
   - Google スプレッドシートへの送信（GAS）
   ============================================= */

document.addEventListener('DOMContentLoaded', function () {

  // 支払い方法: クレジットカード選択時のみカード欄を表示
  var cardFields = document.getElementById('card-fields');
  document.querySelectorAll('input[name="payment"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      cardFields.style.display = (this.value === 'credit') ? 'block' : 'none';
    });
  });

  /* ------------------------------------------
     バリデーション設定（各項目ごとの説明メッセージ）
  ------------------------------------------ */
  var rules = {
    name: {
      validate: function (v) {
        if (!v.trim()) return 'お名前を入力してください。';
        return '';
      }
    },
    kana: {
      validate: function (v) {
        if (!v.trim()) return 'フリガナを入力してください。';
        if (!/^[ァ-ヶー\s　]+$/.test(v.trim())) return 'フリガナは全角カタカナで入力してください。（例：ヤマダ ハナコ）';
        return '';
      }
    },
    zip: {
      validate: function (v) {
        if (!v.trim()) return '郵便番号を入力してください。';
        if (!/^\d{3}-?\d{4}$/.test(v.trim())) return '郵便番号は7桁の数字で入力してください。（例：150-0001）';
        return '';
      }
    },
    pref: {
      validate: function (v) {
        if (!v) return '都道府県を選択してください。';
        return '';
      }
    },
    address: {
      validate: function (v) {
        if (!v.trim()) return '市区町村・番地を入力してください。（例：渋谷区神宮前3-10-5）';
        return '';
      }
    },
    tel: {
      validate: function (v) {
        if (!v.trim()) return '電話番号を入力してください。';
        if (!/^0\d{1,4}-?\d{1,4}-?\d{3,4}$/.test(v.trim())) return '電話番号は半角数字で入力してください。（例：090-1234-5678）';
        return '';
      }
    },
    email: {
      validate: function (v) {
        if (!v.trim()) return 'メールアドレスを入力してください。';
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())) return 'メールアドレスの形式が正しくありません。（例：example@lumea.jp）';
        return '';
      }
    }
  };

  // エラーメッセージ表示・非表示
  function showError(field, message) {
    var wrap = field.closest('.form-field') || field.parentElement;
    var err = wrap.querySelector('.field-error');
    if (!err) {
      err = document.createElement('p');
      err.className = 'field-error';
      err.setAttribute('role', 'alert');
      wrap.appendChild(err);
    }
    err.textContent = message;
    field.classList.add('input-invalid');
    field.setAttribute('aria-invalid', 'true');
  }

  function clearError(field) {
    var wrap = field.closest('.form-field') || field.parentElement;
    var err = wrap.querySelector('.field-error');
    if (err) err.remove();
    field.classList.remove('input-invalid');
    field.removeAttribute('aria-invalid');
  }

  function validateField(field) {
    var rule = rules[field.id];
    if (!rule) return true;
    var msg = rule.validate(field.value);
    if (msg) { showError(field, msg); return false; }
    clearError(field);
    return true;
  }

  // 入力欄を離れたとき・修正中にリアルタイムでチェック
  Object.keys(rules).forEach(function (id) {
    var field = document.getElementById(id);
    if (!field) return;
    field.addEventListener('blur', function () { validateField(field); });
    field.addEventListener('input', function () {
      if (field.classList.contains('input-invalid')) validateField(field);
    });
    if (field.tagName === 'SELECT') {
      field.addEventListener('change', function () { validateField(field); });
    }
  });

  // 同意チェックボックス
  var agree = document.getElementById('agree');
  agree.addEventListener('change', function () {
    if (agree.checked) clearError(agree);
  });

  // スプレッドシート連携用 Google Apps Script のURL
  var GAS_URL = 'https://script.google.com/macros/s/AKfycbxQUgS63x0FWtW0cre29vnTQ8O9MPjzSOgMf2pL-4mfW0z1_UIM5Y-8RcZ9ykblIFKy/exec';

  // 送信 → バリデーション → スプレッドシートへ記録 → 完了画面へ
  document.getElementById('order-form').addEventListener('submit', function (e) {
    e.preventDefault();

    var form = this;
    var submitBtn = form.querySelector('.btn-purchase');

    // 全項目チェック
    var firstInvalid = null;
    Object.keys(rules).forEach(function (id) {
      var field = document.getElementById(id);
      if (field && !validateField(field) && !firstInvalid) firstInvalid = field;
    });

    if (!agree.checked) {
      showError(agree, 'ご注文には各規約への同意が必要です。チェックを入れてください。');
      if (!firstInvalid) firstInvalid = agree;
    }

    if (firstInvalid) {
      firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
      firstInvalid.focus({ preventScroll: true });
      return;
    }

    // 架空の注文番号を生成
    var num = 'LS-' + String(Math.floor(10000000 + Math.random() * 90000000));

    // 送信するフォームデータを組み立て
    var params = new URLSearchParams();
    params.append('orderNumber', num);
    params.append('name', document.getElementById('name').value);
    params.append('kana', document.getElementById('kana').value);
    params.append('zip', document.getElementById('zip').value);
    params.append('pref', document.getElementById('pref').value);
    params.append('address', document.getElementById('address').value);
    params.append('building', document.getElementById('building').value);
    params.append('tel', document.getElementById('tel').value);
    params.append('email', document.getElementById('email').value);
    params.append('cycle', document.getElementById('cycle').value);
    var paymentEl = form.querySelector('input[name="payment"]:checked');
    params.append('payment', paymentEl ? paymentEl.value : '');

    // 二重送信防止
    submitBtn.disabled = true;
    submitBtn.textContent = '送信中...';

    fetch(GAS_URL, {
      method: 'POST',
      mode: 'no-cors',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    })
      .then(function () {
        // no-cors のためレスポンス内容は読めないが、送信完了として扱う
        document.getElementById('order-num').textContent = num;
        document.getElementById('order-form-section').hidden = true;
        document.getElementById('complete-section').hidden = false;
        window.scrollTo({ top: 0, behavior: 'auto' });
      })
      .catch(function (err) {
        console.error('送信エラー:', err);
        alert('送信に失敗しました。通信環境をご確認のうえ、もう一度お試しください。');
      })
      .finally(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = '注文を確定する（デモ）';
      });
  });

});
