import fs from 'fs';

const metadata = JSON.parse(fs.readFileSync('./template.json'));

for (let i = 0; i < 222; i++) {
    metadata.name = `GoingUP Exclusive Premium Membership #${i + 1}`;
    fs.writeFileSync(`./output/${i + 1}.json`, JSON.stringify(metadata, null, 4));
}