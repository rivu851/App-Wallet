import ratelimit from "../config/upstash.js";

const rateLimiter = async(req, res, next)=>{
    try {
        const {success}= await ratelimit.limit("my-rate-limit")
        
        if(!success){
            return res.status(429).json({
                message: "Too many requests, please try later "
            })

        }

        next();

    } catch (error) {
        console.log("Rate limit error", error)
        if (process.env.NODE_ENV === "production") {
            return res.status(503).json({ message: "Rate limiting service unavailable" });
        }
        next();
    }
}

export default rateLimiter;
