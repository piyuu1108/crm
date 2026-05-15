use url::Url;

fn main() {
    let parsed = Url::parse("http://192.168.1.50:1108/app").unwrap();
    let host = parsed.host_str().unwrap();
    let port = parsed.port();
    
    match addr::parse_domain_name(host) {
        Ok(domain) => println!("domain: {:?}", domain.root()),
        Err(_) => println!("err, host: {}, port: {:?}", host, port),
    }

    let parsed2 = Url::parse("http://localhost:3000/").unwrap();
    let host2 = parsed2.host_str().unwrap();
    let port2 = parsed2.port();
    match addr::parse_domain_name(host2) {
        Ok(domain) => println!("domain: {:?}", domain.root()),
        Err(_) => println!("err, host: {}, port: {:?}", host2, port2),
    }
}
