process.env.FORCE_COLOR = '1';
const fs = require('fs');
try {
  const fd = fs.openSync('/dev/tty', 'w');
  fs.writeSync(fd, "HELLO TTY\n");
  fs.closeSync(fd);
} catch (e) {
  console.log("NOT TTY");
}
