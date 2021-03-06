const { GenericCommand } = require('.')
const fs = require('fs')
const audioAssets = `${process.cwd()}/assets/audio`
module.exports = class GenericVoiceCommand {
  constructor (cmdProps) {
    this.cmdProps = cmdProps
    try {
      this.files = fs.readdirSync(`${audioAssets}/${this.cmdProps.dir}`)
    } catch (e) {
      this.files = null
    }
  }

  async run ({ Memer, msg, args, addCD }) {
    const music = Memer.musicManager.get(msg.channel.guild.id)
    if (this.files == null) {
      console.log('Run `git submodule update --init` to pull down the audio files.')
      return 'Seems like you forgot to pull the audio files ;p'
    }

    let file = typeof this.cmdProps.files === 'string'
      ? this.cmdProps.files
      : Memer.randomInArray(this.files).replace(/(\.opus)|(\.ogg)/, '')

    if (this.cmdProps.soundboard) {
      if (args.length === 0) {
        return 'You need to specify which sfx to play.\nChoose one from here: <https://goo.gl/X6EyRq>'
      }
      file = args.join(' ').toLowerCase()
      if (!this.files.includes(`${file}.opus`)) return 'That isnt an option...\nChoose one from here: <https://goo.gl/X6EyRq>'
    }

    if (!msg.member.voiceState.channelID) {
      return msg.reply('join a voice channel fam')
    }

    const perms = Memer.bot.getChannel(msg.member.voiceState.channelID).permissionsOf(Memer.bot.user.id)

    if (!perms.has('voiceConnect') || !perms.has('voiceSpeak') || !perms.has('voiceUseVAD')) {
      return msg.reply('Make sure I have `connect`, `speak`, and `use voice activity` permissions in the channel settings so I can do this command!\n\nHow to do that: https://i.imgur.com/ugplJJO.gif')
    }

    if (music.player) {
      if (!music.playing) {
        await music.reset()
      }
      if (this.cmdProps.skipIfPlaying && music.playing) {
        await music.reset()
      }
      if (music.playing && !this.cmdProps.skipIfPlaying) {
        return this.cmdProps.existingConn
      }
    }

    await addCD()

    if (this.cmdProps.np) {
      let np = file.replace(/_+/g, ' ')
      msg.channel.createMessage({ embed: { title: 'Now Playing...', description: np } })
    } else if (this.cmdProps.message) {
      msg.channel.createMessage(this.cmdProps.message)
    } else {
      msg.addReaction(this.cmdProps.reaction)
    }

    await music.player.join(msg.member.voiceState.channelID)
    await music.ready
    if (music.queue[0]) {
      music.queue = []
    }
    let response = await music.node.load(encodeURIComponent(`http://${Memer.config.webhookServer.host}:${Memer.config.webhookServer.port}/audio/${this.cmdProps.dir}/${file}?token=${Memer.secrets.memerServices.webhookServer}`))
    const { tracks } = response
    if (!tracks[0]) {
      return 'Seems like this didn\'t work, sad.'
    }
    await music.addSong(tracks[0])
  }

  get props () {
    return new GenericCommand(
      null,
      Object.assign({
        cooldown: 3000,
        donorCD: 1000,
        perms: ['addReactions']
      }, this.cmdProps)
    ).props
  }
}
