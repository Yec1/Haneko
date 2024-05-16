import { EmbedBuilder } from "discord.js";

Object.defineProperties(EmbedBuilder.prototype, {
	addField: {
		value: function (name, value, inline = false) {
			return this.addFields({
				name,
				value,
				inline
			});
		},
		enumerable: false
	},
	setConfig: {
		value: function (color, footer) {
			return this.setColor(color && color != null ? color : "#272829");
		}
	}
});
