const express = require("express");
const Chat = require("../../models/Chat");

const Message = require("../../models/Message");
const Notification = require("../../models/Notification");

const router = express.Router();

router.post("/", async (req, res, next) => {
  try {
    const newMessage = {
      sender: req.session.user._id,
      content: req.body.content,
      chat: req.body.chatId
    };

    let message = await Message.create(newMessage);
    message = await message.populate("sender").execPopulate();
    message = await message.populate("chat").execPopulate();
    message = await message.populate("chat.users").execPopulate();

    const chat = await Chat.findByIdAndUpdate(req.body.chatId, {
      latestMessage: message
    });

    chat.users.forEach((userId) => {
      if (userId.toString() === message.sender._id.toString()) {
        return;
      }

      Notification.insertNotification(
        userId,
        message.sender._id,
        "newMessage",
        message.chat._id
      );
    });

    return res.status(201).send(message);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error.message);
  }
});

router.get("/:chatId/messages", async (req, res, next) => {
  try {
    const results = await Message.find({
      chat: req.params.chatId
    }).populate("sender");

    return res.status(200).send(results);
  } catch (error) {
    console.log(error);
    return res.status(500).send(error.message);
  }
});
module.exports = router;
