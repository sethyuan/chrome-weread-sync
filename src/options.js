async function main() {
  const config = await chrome.storage.local.get({
    apiUrl: "http://localhost:12315",
    token: "",
  })
  document.getElementById("apiUrl").value = config.apiUrl
  document.getElementById("token").value = config.token

  const saveBtn = document.getElementById("saveBtn")
  saveBtn.addEventListener("click", save)
}

async function save() {
  await chrome.storage.local.set({
    apiUrl: document.getElementById("apiUrl").value,
    token: document.getElementById("token").value,
  })

  const statusEl = document.getElementById("status")
  statusEl.textContent = "保存成功"
  setTimeout(() => {
    statusEl.textContent = ""
  }, 750)
}

document.addEventListener("DOMContentLoaded", main)
