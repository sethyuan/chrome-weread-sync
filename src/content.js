async function getData(vid, booksSyncKey, bookmarksSyncKey, reviewsSyncKey) {
  try {
    const [shelfChanges, bookmarkChanges, reviewChanges] = await Promise.all([
      getBooks(vid, booksSyncKey),
      getBookmarks(bookmarksSyncKey),
      getReviews(reviewsSyncKey),
    ])
    return {
      code: 200,
      data: {
        books: {
          updated: await batchGetBookInfo(shelfChanges.books),
          removed: shelfChanges.removed,
          syncKey: shelfChanges.synckey,
        },
        bookmarks: {
          updated: simplifyBookmarks(
            bookmarkChanges.updated,
            bookmarkChanges.chapters,
          ),
          removed: bookmarkChanges.removed,
          syncKey: bookmarkChanges.synckey,
        },
        reviews: {
          updated: simplifyReviews(reviewChanges.reviews),
          removed: reviewChanges.removed,
          syncKey: reviewChanges.synckey,
        },
      },
    }
  } catch (err) {
    console.error(err)
    return { code: 400, err }
  }
}

async function getBooks(vid, syncKey) {
  return await getFetch(
    `https://i.weread.qq.com/shelf/sync?userVid=${vid}&synckey=${syncKey}`,
  )
}

async function getBookmarks(syncKey) {
  return await getFetch(
    `https://i.weread.qq.com/book/bookmarklist?synckey=${syncKey}`,
  )
}

async function getReviews(syncKey) {
  return await getFetch(
    `https://i.weread.qq.com/review/list?listType=11&listMode=0&mine=1&synckey=${syncKey}`,
  )
}

async function batchGetBookInfo(books) {
  const batches = splitArray(books, 5)
  for (let i = 0; i < batches.length; i++) {
    batches[i] = await Promise.all(batches[i].map(getBookInfo))
  }
  return batches.flat()
}

async function getBookInfo({ bookId }) {
  const book = await getFetch(
    `https://i.weread.qq.com/book/info?bookId=${bookId}`,
  )
  return {
    title: book.title,
    categories: book.categories?.map(({ title }) => ({ title })),
    author: book.author,
    translator: book.translator,
    publisher: book.publisher,
    publishTime: book.publishTime,
    isbn: book.isbn,
    finishReading: book.finishReading,
    bookId: book.bookId,
    version: book.version,
    cover: book.cover,
    intro: book.intro,
  }
}

async function getFetch(url) {
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw res.code
  return await res.json()
}

function simplifyBookmarks(bookmarks, chapters) {
  return bookmarks.map((b) => ({
    bookId: b.bookId,
    chapterUid: b.chapterUid,
    bookmarkId: b.bookmarkId,
    type: b.type,
    range: b.range,
    markText: b.markText,
    chapterName:
      b.chapterName ??
      b.chapterTitle ??
      chapters.find(
        (c) => c.bookId === b.bookId && c.chapterUid === b.chapterUid,
      )?.title,
    createTime: b.createTime,
  }))
}

function simplifyReviews(reviews) {
  return reviews
    .filter(({ review }) => review.chapterUid != null)
    .map(({ review }) => ({
      bookId: review.bookId,
      chapterUid: review.chapterUid,
      reviewId: review.reviewId,
      range: review.range,
      content: review.content,
      abstract: review.abstract,
      chapterName: review.chapterName ?? review.chapterTitle,
      createTime: review.createTime,
    }))
}

function splitArray(arr, n) {
  const ret = new Array(Math.ceil(arr.length / n))
  for (let i = 0; i < ret.length; i++) {
    ret[i] = arr.slice(i * n, (i + 1) * n)
  }
  return ret
}

chrome.runtime.onMessage.addListener(({ op, args }, sender, sendResponse) => {
  if (op === "getData") {
    getData(...args).then((ret) => {
      sendResponse(ret)
    })
  }
  return true
})
