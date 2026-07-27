const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
    },
    email: {
    type: String,
    required: [true, 'Email address is required'],
    unique: [true, 'Email address already exists'], 
    lowercase: true,
    trim: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please fill a valid email address']
  },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters long'],
        select: false, // Exclude password from query results by default
    },
    // A separate secret the user must enter to authorise money transfers.
    // Optional at signup; the user sets it later from their profile. Stored
    // hashed and never returned by default.
    transferPassword: {
        type: String,
        minlength: [4, 'Transfer password must be at least 4 characters long'],
        select: false,
    },
    systemUser: {
        type: Boolean,
        default: false,
        immutable: true,
        select: false,
    },
},
{
    timestamps: true, // Automatically add createdAt and updatedAt fields
}
);

userSchema.pre('save', async function () {
    // When the password was already hashed elsewhere (e.g. a pending
    // registration verified via OTP), skip re-hashing to avoid double-hashing.
    if (this.isModified('password') && !this.$locals.skipPasswordHash) {
        this.password = await bcrypt.hash(this.password, 10);
    }

    // Hash the transfer password on set/change, same as the login password.
    if (this.isModified('transferPassword') && this.transferPassword) {
        this.transferPassword = await bcrypt.hash(this.transferPassword, 10);
    }
});

userSchema.methods.comparePassword = async function (candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
}

userSchema.methods.compareTransferPassword = async function (candidatePassword) {
    if (!this.transferPassword) return false;
    return await bcrypt.compare(candidatePassword, this.transferPassword);
}


const User = mongoose.model('User', userSchema);

module.exports = User;