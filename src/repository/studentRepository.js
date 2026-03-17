let collection;

export const init = db => collection = db.collection('college');

export const addStudent = async ({id, name, password}) => {
    const existingStudent = await collection.findOne({_id: id});
    if (existingStudent) {
        return false;
    }
    await collection.insertOne({_id: id, name, password, scores: {}});
    return true;
}

export const findStudent = async (id) => {
    return renameId(await collection.findOne({_id: id}));
}


export const deleteStudent = async (id) => {
    return renameId(await collection.findOneAndDelete({_id: id}));
}

export const updateStudent = async (id, data) => {
    return renameId(await collection.findOneAndUpdate(
            {_id: id},
            {$set: data},
            {returnDocument: 'after'}
        )
    );
}

export const addScore = async (id, exam, score) => {
    return renameId(await collection.findOneAndUpdate(
            {_id: id},
            {$set: {[`scores.${exam}`]: score}},
            {returnDocument: 'after'}
        )
    );
}

export const findByName = async (name) => {
    const students = [];
    const cursor = collection.find({name: {$regex: `^${name}$`, $options: 'i'}});
    while (await cursor.hasNext()) {
        students.push(renameId(await cursor.next()));
    }
    return students;
}

export const countByNames = async (names) => {
    const regexConditions = names.map(name => ({
        name: {$regex: `^${name}$`, $options: 'i'}
    }));
    return collection.countDocuments({$or: regexConditions});
}

export const findByMinScore = async (exam, minScore) => {
    const students = [];
    const cursor = collection.find({[`scores.${exam}`]: {$gte: minScore}});
    for await (const student of cursor) {
        students.push(renameId(student));
    }
    return students;
}

function renameId(student) {
    if (student) {
        student.id = student._id;
        delete student._id;
    }
    return student;
}