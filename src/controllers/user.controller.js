import { ApiError } from "../utils/ApiError.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { User } from "./../models/user.model.js";
import  jwt  from 'jsonwebtoken';


const generateAccessAndRefreshTokens=async(userId)=>{

  try {

    const user=await User.findById(userId)
    const accessToken=user.generateAccessToken()
    const refreshToken=user.generateRefreshToken()
    user.refreshToken=refreshToken
    await user.save({validateBeforeSave:false})

    return{accessToken,refreshToken}



  } catch (error) {
    
    throw new ApiError(500,"Something went wrong while generatin request access token")
  }

}

const registerUser = asyncHandler(async (req, res) => {
  const { userName, fullName, email, password } = req.body;

  console.log("email:", email);

  if (
    [fullName, email, userName, password].some((field) => field?.trim() === "")
  ) {
    throw new ApiError(400, "All fields are required");
  }

  const existedUser = await User.findOne({
    $or: [{ userName }, { email }],
  });
  if (existedUser) {
    throw new ApiError(409, "User name or email already exist");
  }

  console.log(req.files);

  const avatarLocalPath = req.files?.avatar[0]?.path;
  //const coverImageLocalPath=req.files?.coverImage[0]?.path;

  let coverImageLocalPath;
  if (
    req.files &&
    Array.isArray(req.files.coverImage) &&
    req.files.coverImage.length > 0
  ) {
    coverImageLocalPath = req.files.coverImage[0].path;
  }
  if (!avatarLocalPath) {
    throw new ApiError(400, "Avatar file is required");
  }

  const avatar = await uploadOnCloudinary(avatarLocalPath);
  const coverImage = await uploadOnCloudinary(coverImageLocalPath);

  if (!avatar) {
    throw new ApiError(400, "Avatar file is required");
  }

  const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase(),
  });
  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
  );

  if (!createdUser) {
    throw new ApiError(500, "Something went worng while registering the user ");
  }

  return res
    .status(201)
    .json(new ApiResponse(200, createdUser, "User registered successfully"));
});

const loginUser = asyncHandler(async (req, res) => {
  const { userName, password, email } = req.body;

  if (!userName && !email) {
    throw new ApiError(400, "user name or email is required");
  }

  const user = await User.findOne({
    $or: [
      {
        userName,
      },
      { email },
    ],
  });
  if(!user){
    throw new ApiError(404,"user doesnot exist")
  }
  //check password validation
  const isPasswordValid=await user.isPasswordCorrect(password)
  if(!isPasswordValid){
    throw new ApiError(404,"Invalid user crediential")
  }
  const {accessToken,refreshToken}=await generateAccessAndRefreshTokens(user._id)

  const loggedInUser=await User.findById(user._id).select("-password -refreshToken")

   //send cookies

   const options={
    httpOnly:true,
    secure:true,
   }

   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",refreshToken,options)
   .json(
    new ApiResponse(200,
      {
        user:loggedInUser,accessToken,refreshToken
      },
      "User logged In successfully"
    )
   )
});


const logoutUser=asyncHandler(async(req,res)=>{

 await User.findByIdAndUpdate(req.user._id,{
    $set:{
      refreshToken:1
    },
    new:true
  })

  const options={
    httpOnly:true,
    secure:true,
   }
   return res
   .status(200)
   .clearCookie("accessToken",options)
   .clearCookie("refreshToken",options)
   .json(new ApiResponse(200,{},"User loged out"))

})



const refreshAccessToken=asyncHandler(async(req,res)=>{
  try {
    const inComingRequestToken=req.cookies.refreshToken || req.body.refreshToken
    if(!inComingRequestToken){
      throw new ApiError(401,"Unauthorized request")
    }
    const decodedToken=jwt.verify(
      inComingRequestToken,
      process.env.REFRESH_TOKEN_SECRET
    )
   const user=await User.findById(decodedToken?._id)
  
    if(!user){
      throw new ApiError(401,"Invalid refresh token")
    }
    if(inComingRequestToken !==user?.refreshToken){
      throw new ApiError(401,"Refresh token is expire or used ")
    }
  
    const options={
      httpOnly:true,
      secure:true
    }
   const {accessToken,newRefreshToken}=await generateAccessAndRefreshTokens(user._id)
   return res
   .status(200)
   .cookie("accessToken",accessToken,options)
   .cookie("refreshToken",newRefreshToken,options)
   .json(
    new ApiResponse(
      200,
      {accessToken,refreshToken:newRefreshToken},
      "Access token refreshed"
    )
   )
  } catch (error) {
    throw new ApiError(401,error?.message || "Invalid refreshtoken")
    
  }

})
export { registerUser, loginUser,logoutUser ,refreshAccessToken};
