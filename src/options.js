async function main() {
  const { apiUrl, token } = await chrome.storage.local.get({
    apiUrl: "http://localhost:12315",
    token: "",
  })
  const { noSyncBookList } = await chrome.storage.sync.get({
    noSyncBookList: "",
  })
  document.getElementById("apiUrl").value = apiUrl
  document.getElementById("token").value = token
  document.getElementById("noSync").value = noSyncBookList

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
  await chrome.storage.sync.set({
    noSyncBookList: document.getElementById("noSync").value,
  })
  showMessage("保存成功")
}

async function clearKeys() {
  // Clear all sync keys.
  const settings = await chrome.storage.sync.get({
    noSyncBookList: "",
  })
  await chrome.storage.sync.clear()
  await chrome.storage.sync.set(settings)
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
