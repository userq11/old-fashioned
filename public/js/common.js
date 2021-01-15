$("#postTextarea, #replyTextarea").keyup((e) => {
  const isModalOpen = $(e.target).parents(".modal").length === 1;

  if ($(e.target).val().trim() === "") {
    if (isModalOpen) {
      $("#submitReplyButton").prop("disabled", true);
      return;
    }

    $("#submitPostButton").prop("disabled", true);
    return;
  } else {
    if (isModalOpen) {
      $("#submitReplyButton").prop("disabled", false);
      return;
    }
    $("#submitPostButton").prop("disabled", false);
  }
});

$("#submitPostButton, #submitReplyButton").click((e) => {
  const isModal = $(e.target).parents(".modal").length === 1;

  const data = {
    content: isModal ? $("#replyTextarea").val() : $("#postTextarea").val()
  };

  if (isModal) {
    const id = $(e.target).data().id;
    data.replyTo = id;
  }

  $.post("/api/posts", data, (response, status, xhr) => {
    if ($(".postsContainer p").length === 1) {
      $(".postsContainer").empty();
    }

    if (data.replyTo) {
      location.reload();
    } else {
      const postTemplate = createPostTemplate(response);
      $(".postsContainer").prepend(postTemplate);
      $("#postTextarea").val("");
      $("#submitPostButton").prop("disabled", true);
    }
  });
});

$(document).on("click", ".bumpButton", (e) => {
  const postId = extractPostId($(e.target));

  if (!postId) {
    return;
  }

  $.ajax({
    url: `/api/posts/${postId}/bump`,
    type: "POST",
    success: (postData) => {
      if (!postData) {
        location.reload();
        return;
      }

      $(e.target)
        .find("span")
        .text(postData.bumpUsers.length || "");

      if (postData.bumpUsers.includes(loggedInUser._id)) {
        $(e.target).addClass("hasBumped");
      } else {
        $(e.target).removeClass("hasBumped");
      }

      location.reload();
    }
  });
});

$(document).on("click", ".alienButton", (e) => {
  const postId = extractPostId($(e.target));

  if (!postId) {
    return;
  }

  $.ajax({
    url: `/api/posts/${postId}/alien`,
    type: "PUT",
    success: (postData) => {
      $(e.target)
        .find("span")
        .text(postData.aliens.length || "");

      if (postData.aliens.includes(loggedInUser._id)) {
        $(e.target).addClass("hasAliened");
      } else {
        $(e.target).removeClass("hasAliened");
      }
    }
  });
});

$(document).on("click", ".post", (e) => {
  const postId = extractPostId($(e.target));
  if (postId && !$(e.target).is("button")) {
    window.location.href = "/post/" + postId;
  }
});

$("#replyModal").on("show.bs.modal", (e) => {
  const postId = extractPostId($(e.relatedTarget));
  $("#submitReplyButton").data("id", postId);

  $.get(`/api/posts/${postId}`, ({ post }) => {
    const postTemplate = createPostTemplate(post);
    $("#clickedPostContainer").prepend(postTemplate);
  });
});

$("#replyModal").on("hidden.bs.modal", () => {
  $("#clickedPostContainer").empty();
});

$("#deletePostModal").on("show.bs.modal", (e) => {
  const postId = extractPostId($(e.relatedTarget));
  $("#deletePostButton").data("id", postId);
});

$("#deletePostButton").click((e) => {
  const postId = $(e.target).data("id");

  $.ajax({
    url: `/api/posts/${postId}`,
    type: "DELETE",
    success: (postData) => {
      location.reload();
    }
  });
});

const createPostTemplate = (postData, mainPost = false) => {
  const bumpedBy = postData.bumpData ? postData.addedBy.username : null;
  postData = postData.bumpData ? postData.bumpData : postData;

  const timestamp = timeDifference(new Date(), new Date(postData.createdAt));

  const alienButtonActive = postData.aliens.includes(loggedInUser._id)
    ? "hasAliened"
    : "";

  const bumpedButtonActive = postData.bumpUsers.includes(loggedInUser._id)
    ? "hasBumped"
    : "";

  let isReply = "";
  if (postData.replyTo && postData.replyTo._id) {
    const replyToUsername = postData.replyTo.addedBy.username;
    isReply = `<div class="isReply">
      Replied to <a href="/profile/${replyToUsername}">${replyToUsername}</a>
    </div>`;
  }

  let deleteButton = "";
  if (postData.addedBy._id === loggedInUser._id) {
    deleteButton = `<button data-id="${postData._id}" data-toggle="modal" data-target="#deletePostModal"><i class="far fa-trash-alt"></i></button>`;
  }

  return `<div class="post ${mainPost ? "largeFont" : ""}" data-id="${
    postData._id
  }">
    <div class="additionalContainer">
      ${
        bumpedBy
          ? `<span>
            <i class="fas fa-exclamation"></i>
            Bumped by <a href="/profile/${bumpedBy}">${bumpedBy}</a>
          </span>`
          : ""
      }
    </div>
    <div class="mainContentContainer">
      <div class="userPhotoContainer">
        <img src="${postData.addedBy.profilePhoto}" />
      </div>
      <div class="postContentContainer">
        <div class="postHeader">
          <a class="showUnderline" href="/profile/${
            postData.addedBy.username
          }">${postData.addedBy.firstName} ${postData.addedBy.lastName}</a>
          <span class="postUsername">${postData.addedBy.username}</span>
          <span class="postDate">${timestamp}</span>
          ${deleteButton}
        </div>
        ${isReply}
        <div class="postBody">
          <span>${postData.content}</span>
        </div>
        <div class="postFooter">
          <div class="postButtonContainer">
            <button data-toggle="modal" data-target="#replyModal">
              <i class="fas fa-reply"></i>
            </button>
          </div>
          <div class="postButtonContainer orange">
            <button class="bumpButton ${bumpedButtonActive}">
              <i class="fas fa-level-up-alt"></i>
              <span>${postData.bumpUsers.length || ""}</span>
            </button>
          </div>
          <div class="postButtonContainer blue">
            <button class="alienButton ${alienButtonActive}">
              <i class="fab fa-reddit-alien"></i>
              <span>${postData.aliens.length || ""}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>`;
};

const extractPostId = (elem) => {
  const isRoot = elem.hasClass("post");
  const rootEl = isRoot ? elem : elem.closest(".post");
  const postId = rootEl.data().id;

  if (!postId) {
    return;
  }

  return postId;
};

function timeDifference(current, previous) {
  const msPerMinute = 60 * 1000;
  const msPerHour = msPerMinute * 60;
  const msPerDay = msPerHour * 24;
  const msPerMonth = msPerDay * 30;
  const msPerYear = msPerDay * 365;

  const elapsed = current - previous;

  if (elapsed < msPerMinute) {
    if (elapsed / 1000 < msPerMinute) {
      return "A few seconds ago";
    }
    return Math.round(elapsed / 1000) + " seconds ago";
  } else if (elapsed < msPerHour) {
    if (Math.round(elapsed / msPerMinute) < 2) {
      return Math.round(elapsed / msPerMinute) + " minute ago";
    }
    return Math.round(elapsed / msPerMinute) + " minutes ago";
  } else if (elapsed < msPerDay) {
    return Math.round(elapsed / msPerHour) + " hours ago";
  } else if (elapsed < msPerMonth) {
    return Math.round(elapsed / msPerDay) + " days ago";
  } else if (elapsed < msPerYear) {
    return Math.round(elapsed / msPerMonth) + " months ago";
  } else {
    return Math.round(elapsed / msPerYear) + " years ago";
  }
}

const renderPostWithReplies = (results, container) => {
  container.empty();

  if (results.replyTo && results.replyTo._id) {
    const template = createPostTemplate(results.replyTo);
    container.prepend(template);
  }

  const mainPost = createPostTemplate(results.post, true);
  container.prepend(mainPost);

  results.replies.forEach((reply) => {
    const template = createPostTemplate(reply);
    container.prepend(template);
  });
};
