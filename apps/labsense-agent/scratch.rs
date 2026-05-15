use addr::parser::DomainName;

fn main() {
    let d = "docs.github.com".parse::<DomainName>().unwrap();
    println!("{}", d.root().unwrap_or(""));
}
