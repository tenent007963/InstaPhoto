# **InstaPhoto**
Aim to let users send freshly taken photos to computer easily.


# Features:
- Take photos from Client-side and instantly shows up on Server-side
- Integrated PPTXGenJS function
- Easily paste clipboard photo using Ctrl+V
- Simple thumbnail preview for newly added photos 
- Multiple workspaces for multiuser scenario (WIP)
- Support hotkeys and remote controlling (WIP)

# How to use:

Simply clone this repo and run `npm install` in console.\
To start run `npm start` in console

For Heroku:\
Just clone this repo and now it's ready to go. 

# Hotkeys:

`x`: Enable / Create PPT file\
`Ctrl + Shift + X`: Disable / Discard PPT file\
`\`: Toggle SaveImage\
`Enter`: Save PPT file if enabled


# To-Do:
 1. Adding more features / plugins\
	A. Auto lock room from host side to prevent 2 servers connecting same room\
	B. Change sync mode to PDF mode\
	C. Enable `console.log` send back to heroku for debug purpose\
	D. Lock process when retrieving/processing images and unlock to save file\
	E. Socket.io perform binary-file multi-part upload 
 2. Make whole html page js generated
 3. Make the whole damn code async and simplify the heck out of it
