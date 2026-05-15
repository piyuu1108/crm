use url::Url;

fn main() {
    let host = "docs.github.com";
    if let Ok(domain) = addr::parse_domain_name(host) {
        println!("{}", domain.root());
    }
}
