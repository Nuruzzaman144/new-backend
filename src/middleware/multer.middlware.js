import multer from "multer";

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./public/temp");
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
    console.log("REQ HIT ✅");
console.log("FILES >>>", req.files);
  },
});


export const upload = multer({
     storage,
    
});
