async function main() {
  const config = await chrome.storage.local.get({
    apiUrl: "http://localhost:12315",
    token: "",
  })
  document.getElementById("apiUrl").value = config.apiUrl
  document.getElementById("token").value = config.token

  const saveBtn = document.getElementById("saveBtn")
  saveBtn.addEventListener("click", save)

  const clearBtn = document.getElementById("clearKey")
  clearBtn.addEventListener("click", clearKeys)
}

async function save() {
  await chrome.storage.local.set({
    apiUrl: document.getElementById("apiUrl").value,
    token: document.getElementById("token").value,
  })
  showMessage("保存成功")
}

async function clearKeys() {
  await chrome.storage.sync.clear()
  showMessage("已清除")
}

function showMessage(message) {
  const statusEl = document.getElementById("status")
  statusEl.textContent = message
  setTimeout(() => {
    statusEl.textContent = ""
  }, 750)
}

document.addEventListener("DOMContentLoaded", main)
