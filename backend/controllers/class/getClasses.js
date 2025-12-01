import Class from "../../models/Master_data/Class.js";

export const getClasses = async (req, res) => {
    try {
        const classes = await Class.find();
        res.status(200).json(classes);
    } catch (err) {
        res.status(500).json({ message: "Server error", error: err });
    }
};
