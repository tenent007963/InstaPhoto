# **InstaPhoto**
Aim to let users send freshly taken photos to computer easily.


# Features:
- Take photos from Client-side and instantly shows up on Server-side
- Intergrated PPTXGenJS function
- Easily paste clipboard photo using Ctrl+V
- Thubnail preview for newly added photos 
- Multiple workspace for multiuser scenario (WIP)
- Support hotkeys and remote controlling (WIP)

# How to use:

Simply clone this repo and run `npm install` in console.\
To start run `npm start` in console

For Heroku:\
Just clone this repo and its now ready to go. 

# Hotkeys:

`x`: Enable / Create PPT file\
`Ctrl + Shift + X`: Disable / Discard PPT file\
`\`: Toggle SaveImage\
`Enter`: Save PPT file if enabled


# To-Do:
 1. Adding more features / plugins\
	a. multiroom through generate / scan qr\
	b. Implement cookie usage for client side to remember last room name\
	c. Auto lock room from host side to prevent multiple server connected same room\
 2. Better UI for client side
 3. Server side : Replace initialization screen to mode selection ( CS, Tech, PDF)
 4. Enable console.log send back to heroku for debug purpose
 5. Check hotkey sometimes not working
 6. Socket.io perform file multi-part upload 
 99. Simplify code
