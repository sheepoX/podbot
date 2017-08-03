# podbot
A Discord bot designed to record voice chat audio, aimed at recording a specific podcast. Originally created by Fiddleskins. Edited by sheepoX to include podcast template files.

Click [here](https://discordapp.com/oauth2/authorize?client_id=334496650510991371&scope=bot&permissions=133237760) to add my instance of it.

### The current commands are:
- `/create_podcast TemplateTitle` - Create podcast template csv
- `/add_topic |Topic|Link|StartTime` - Add topic to template with link for reference and a approximated start time
- `/finish_podcast` - End podcast template creation
- `/podon PodcastTitle` - The bot starts recording with or without a template loaded as PodcastTitle. If no template loaded, PodcastTitle will only act as a title
- `/next_topic` - Move onto next topic in template while podon
- `/podoff` - The bot stops recording and creates podcast guide file if template loaded

Podcast guide file will be saved to `podbot\podcasts\PodcastTitle-timestamp\PodcastTitle-Guide.csv`
  
The bot will generate audio fragments saved to `podbot\podcasts\<PodcastTitle-timestamp>.opus_string`. 
These will need to be first decoded into PCM by doing:

`node decodeOpus.js <name of the folder containing the podcast session you want processed>`

These will then need to be reassembled using the processFragments.js file in the following fashion:

`node processFragments.js <name of the folder containing the podcast session you want processed>`

This will generate a file for each recorded user with their id as the filename. These files can then be imported into your favourite audio software (such as audacity) side by side and everything should line up on the timeline nicely.

It's worth noting that you'll need to host the bot yourself if you want access to the recording it makes - if you just use my instance you rely on me giving you the audio it generates.

## You want your own?
Then clone this repo and do the thing with the discord and the applications.

You will also need to place a text file called 'controllers' in the same place containing whitespace separated user IDs in order for anyone to be able to control the bot.
