const { EmbedBuilder } = require("discord.js");

Object.defineProperties(EmbedBuilder.prototype, {
  addField: {
    value: function (name, value, inline = false) {
      return this.addFields({
        name,
        value,
        inline,
      });
    },
    enumerable: false,
  },
});
